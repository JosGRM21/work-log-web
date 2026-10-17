import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { app } from '../../src/server/app.js';
import { prisma } from '../../src/server/db/client.js';

describe('Media Pipeline & Physical Purge API (Integration)', () => {
  let server: Server;
  let baseUrl: string;
  let sessionCookie = '';
  let testWorkId = '';
  let uploadedMediaId = '';
  let uploadedFilePath = '';

  // Búfer legítimo de PNG (1x1 píxel) para validación de magic bytes y pipeline sharp
  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  // Búfer sintético de MP4 con cabecera ftyp legítima (16 bytes)
  const validMp4Buffer = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
  ]);

  beforeAll(async () => {
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}/api/v1`;

    // 1. Iniciar sesión administrativa
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

    // 2. Crear trabajo de prueba para asociarle archivos multimedia
    const workRes = await fetch(`${baseUrl}/works`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        title: 'Trabajo para Pruebas Multimedia Fase 4',
        status: 'in_progress',
        reference_date: '2026-10-11',
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

  it('POST /works/:id/media sin autenticación debe retornar 401', async () => {
    const formData = new FormData();
    formData.append('files', new Blob([validPngBuffer], { type: 'image/png' }), 'foto.png');

    const res = await fetch(`${baseUrl}/works/${testWorkId}/media`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(401);
  });

  it('POST /works/:id/media con archivo ejecutable camuflado debe rechazar con 400 (RNF-SEC-03)', async () => {
    const fakeExeBuffer = Buffer.from([
      0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);
    const formData = new FormData();
    formData.append('files', new Blob([fakeExeBuffer], { type: 'image/png' }), 'malicioso.png');

    const res = await fetch(`${baseUrl}/works/${testWorkId}/media`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
      body: formData,
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('BAD_REQUEST');
  });

  it('POST /works/:id/media debe subir una imagen legítima y devolver 201', async () => {
    const formData = new FormData();
    formData.append(
      'files',
      new Blob([validPngBuffer], { type: 'image/png' }),
      'evidencia-estructura.png',
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
        type: string;
        size_bytes: number;
      }>;
    };

    expect(Array.isArray(json.uploaded)).toBe(true);
    expect(json.uploaded.length).toBe(1);
    const item = json.uploaded[0];
    expect(item.type).toBe('image');
    expect(item.url).toContain('/uploads/works/');
    uploadedMediaId = item.id;
    uploadedFilePath = item.url;

    // Verificar existencia física del archivo en disco local
    const relativeDiskPath = item.url.replace(/^\/uploads\//, '');
    const absoluteDiskPath = path.resolve(process.cwd(), 'uploads', relativeDiskPath);
    const stats = await stat(absoluteDiskPath);
    expect(stats.isFile()).toBe(true);
  });

  it('POST /works/:id/media debe subir un video legítimo y registrar type video', async () => {
    const formData = new FormData();
    formData.append('files', new Blob([validMp4Buffer], { type: 'video/mp4' }), 'video-prueba.mp4');

    const res = await fetch(`${baseUrl}/works/${testWorkId}/media`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
      body: formData,
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      uploaded: Array<{ type: string }>;
    };
    expect(json.uploaded[0].type).toBe('video');
  });

  it('DELETE /media/:id sin autenticación debe retornar 401', async () => {
    const res = await fetch(`${baseUrl}/media/${uploadedMediaId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('DELETE /media/:id con ID inexistente debe retornar 404', async () => {
    const res = await fetch(`${baseUrl}/media/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /media/:id debe eliminar el registro con 204 y purgar el archivo físico del disco (RN-04)', async () => {
    const res = await fetch(`${baseUrl}/media/${uploadedMediaId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(204);

    // 1. Verificar eliminación en base de datos
    const dbAsset = await prisma.mediaAsset.findUnique({
      where: { id: uploadedMediaId },
    });
    expect(dbAsset).toBeNull();

    // 2. Verificar purga física en disco
    const relativeDiskPath = uploadedFilePath.replace(/^\/uploads\//, '');
    const absoluteDiskPath = path.resolve(process.cwd(), 'uploads', relativeDiskPath);
    await expect(stat(absoluteDiskPath)).rejects.toThrow();
  });
});
