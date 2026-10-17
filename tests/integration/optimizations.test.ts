import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { stat, writeFile, mkdir, utimes } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { app } from '../../src/server/app.js';
import { prisma } from '../../src/server/db/client.js';
import { purgeOrphanFiles } from '../../src/server/jobs/purge-orphans.js';

describe('Performance, Media Pipeline & Caching Optimizations (Integration)', () => {
  let server: Server;
  let baseUrl: string;
  let sessionCookie = '';
  let testWorkId = '';
  let uploadedMediaId = '';
  let mainFilePath = '';
  let thumbFilePath = '';

  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeAll(async () => {
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}/api/v1`;

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@empresa.com',
        password: 'PasswordSegura123!',
      }),
    });
    const rawCookie = loginRes.headers.get('set-cookie');
    if (rawCookie) {
      sessionCookie = rawCookie.split(';')[0];
    }

    const workRes = await fetch(`${baseUrl}/works`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        title: 'Trabajo de prueba optimizaciones',
        description: 'Descripción pesada que no debe viajar en el feed general de listado',
        status: 'in_progress',
        reference_date: '2026-10-15',
      }),
    });
    const workJson = (await workRes.json()) as { id: string };
    testWorkId = workJson.id;
  });

  afterAll(async () => {
    if (testWorkId) {
      await prisma.workItem.delete({ where: { id: testWorkId } }).catch(() => {});
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('GET /works debe devolver Cache-Control: public, max-age=0, must-revalidate y meta.summary global', async () => {
    const res = await fetch(`${baseUrl}/works`);
    expect(res.status).toBe(200);

    const cacheControl = res.headers.get('cache-control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=0');
    expect(cacheControl).toContain('must-revalidate');

    const json = (await res.json()) as {
      data: Array<Record<string, unknown>>;
      meta: {
        total: number;
        summary?: {
          completed: number;
          in_progress: number;
          pending: number;
          total_media: number;
        };
      };
    };

    expect(json.meta.summary).toBeDefined();
    expect(typeof json.meta.summary?.completed).toBe('number');
    expect(typeof json.meta.summary?.in_progress).toBe('number');
    expect(typeof json.meta.summary?.pending).toBe('number');
    expect(typeof json.meta.summary?.total_media).toBe('number');

    // RN-PERF-01: payload estricto no debe incluir description en el listado general
    const foundWork = json.data.find((w) => w.id === testWorkId);
    expect(foundWork).toBeDefined();
    expect(foundWork?.description).toBeUndefined();
  });

  it('GET /works/:id debe devolver Cache-Control condicional', async () => {
    const res = await fetch(`${baseUrl}/works/${testWorkId}`);
    expect(res.status).toBe(200);

    const cacheControl = res.headers.get('cache-control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=0');
    expect(cacheControl).toContain('must-revalidate');

    const json = (await res.json()) as { id: string; description: string };
    expect(json.id).toBe(testWorkId);
    expect(json.description).toBe('Descripción pesada que no debe viajar en el feed general de listado');
  });

  it('POST /works/:id/media/presign debe responder directUpload: false en entorno local', async () => {
    const res = await fetch(`${baseUrl}/works/${testWorkId}/media/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        files: [
          {
            name: 'foto1.jpg',
            type: 'image/jpeg',
            size: 1024 * 50,
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { directUpload: boolean };
    expect(json.directUpload).toBe(false);
  });

  it('POST /works/:id/media debe comprimir a WebP y generar thumbnail compacto en disco', async () => {
    const formData = new FormData();
    formData.append(
      'files',
      new Blob([validPngBuffer], { type: 'image/png' }),
      'captura-alta-resolucion.png',
    );

    const res = await fetch(`${baseUrl}/works/${testWorkId}/media`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
      body: formData,
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      uploaded: Array<{
        id: string;
        url: string;
        thumbnail_url?: string;
        type: string;
      }>;
    };

    expect(json.uploaded.length).toBe(1);
    const media = json.uploaded[0];
    uploadedMediaId = media.id;
    mainFilePath = media.url;
    thumbFilePath = media.thumbnail_url || '';

    expect(media.type).toBe('image');
    expect(media.url.endsWith('.webp')).toBe(true);
    expect(media.thumbnail_url?.endsWith('-thumb.webp')).toBe(true);

    // Verificar existencia física del archivo principal en WebP
    const mainDisk = path.resolve(process.cwd(), 'uploads', mainFilePath.replace(/^\/uploads\//, ''));
    const mainStats = await stat(mainDisk);
    expect(mainStats.isFile()).toBe(true);

    // Verificar existencia física del thumbnail en WebP
    const thumbDisk = path.resolve(process.cwd(), 'uploads', thumbFilePath.replace(/^\/uploads\//, ''));
    const thumbStats = await stat(thumbDisk);
    expect(thumbStats.isFile()).toBe(true);
  });

  it('purgeOrphanFiles debe eliminar archivos huérfanos con antigüedad > 2h y preservar archivos de la BD', async () => {
    const orphanDir = path.resolve(process.cwd(), 'uploads', 'works', 'test-gc-orphan');
    await mkdir(orphanDir, { recursive: true });

    const orphanPath = path.join(orphanDir, 'archivo-huerfano.webp');
    await writeFile(orphanPath, 'contenido huérfano');

    // Simular que el archivo tiene más de 3 horas de antigüedad
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await utimes(orphanPath, threeHoursAgo, threeHoursAgo);

    const gcResult = await purgeOrphanFiles();

    expect(gcResult.purged).toBeGreaterThanOrEqual(1);
    expect(gcResult.purgedKeys.some((k) => k.includes('test-gc-orphan'))).toBe(true);

    // Comprobar que el archivo huérfano ya no existe en disco
    await expect(stat(orphanPath)).rejects.toThrow();

    // Comprobar que el archivo principal del trabajo sigue intacto
    const mainDisk = path.resolve(process.cwd(), 'uploads', mainFilePath.replace(/^\/uploads\//, ''));
    const mainStats = await stat(mainDisk);
    expect(mainStats.isFile()).toBe(true);
  });

  it('DELETE /media/:id debe eliminar el archivo principal y el thumbnail en cascada', async () => {
    const res = await fetch(`${baseUrl}/media/${uploadedMediaId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(204);

    // Ambos archivos deben haberse eliminado físicamente
    const mainDisk = path.resolve(process.cwd(), 'uploads', mainFilePath.replace(/^\/uploads\//, ''));
    await expect(stat(mainDisk)).rejects.toThrow();

    const thumbDisk = path.resolve(process.cwd(), 'uploads', thumbFilePath.replace(/^\/uploads\//, ''));
    await expect(stat(thumbDisk)).rejects.toThrow();
  });
});
