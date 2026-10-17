import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../../src/server/app.js';
import { prisma } from '../../src/server/infra/db/client.js';

interface WorkItemSummary {
  id: string;
  title: string;
  status: string;
  reference_date: string;
}

interface ListResponse {
  data: WorkItemSummary[];
  meta: { total: number };
}

describe('Works CRUD API (Integration)', () => {
  let server: Server;
  let baseUrl: string;
  let sessionCookie = '';
  let createdWorkId = '';

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

    // Calentamiento del pool de conexiones PostgreSQL y modelos Prisma (RNF-PERF-03)
    await fetch(`${baseUrl}/works`);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('GET /works debe devolver el feed en menos de 250ms (RNF-PERF-03)', async () => {
    const t0 = performance.now();
    const res = await fetch(`${baseUrl}/works`);
    const duration = performance.now() - t0;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(250);
    const json = (await res.json()) as ListResponse;
    expect(Array.isArray(json.data)).toBe(true);
    expect(typeof json.meta.total).toBe('number');
  });

  it('GET /works?status=in_progress debe filtrar correctamente por estado', async () => {
    const res = await fetch(`${baseUrl}/works?status=in_progress`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as ListResponse;
    expect(json.data.every((w) => w.status === 'in_progress')).toBe(true);
  });

  it('GET /works/:id con UUID inexistente debe devolver 404', async () => {
    const res = await fetch(`${baseUrl}/works/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it('POST /works sin autenticación debe responder 401', async () => {
    const res = await fetch(`${baseUrl}/works`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'No Autorizado' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /works con end_date < start_date debe rechazar con 400 (RN-02)', async () => {
    const res = await fetch(`${baseUrl}/works`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        title: 'Trabajo Fechas Inválidas',
        start_date: '2026-10-20',
        end_date: '2026-10-10',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /works con datos válidos debe retornar 201 y crear el trabajo', async () => {
    const res = await fetch(`${baseUrl}/works`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        title: 'Construcción de Escalera Metálica',
        description: 'Perfiles estructurales y peldaños antideslizantes.',
        status: 'pending',
        reference_date: '2026-10-12',
        start_date: '2026-10-15',
        end_date: '2026-10-25',
        next_maintenance_date: '2027-04-15',
      }),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { id: string; title: string };
    expect(json.id).toBeTruthy();
    expect(json.title).toBe('Construcción de Escalera Metálica');
    createdWorkId = json.id;

    const detailRes = await fetch(`${baseUrl}/works/${createdWorkId}`);
    expect(detailRes.status).toBe(200);
    const detailJson = (await detailRes.json()) as { next_maintenance_date: string };
    expect(detailJson.next_maintenance_date).toBe('2027-04-15');
  });

  it('PATCH /works/:id debe actualizar parcialmente el trabajo y su fecha de próximo mantenimiento', async () => {
    const res = await fetch(`${baseUrl}/works/${createdWorkId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        status: 'in_progress',
        description: 'Actualización en curso.',
        next_maintenance_date: '2027-06-20',
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe('in_progress');

    const detailRes = await fetch(`${baseUrl}/works/${createdWorkId}`);
    expect(detailRes.status).toBe(200);
    const detailJson = (await detailRes.json()) as { next_maintenance_date: string };
    expect(detailJson.next_maintenance_date).toBe('2027-06-20');
  });

  it('PATCH /works/:id debe rechazar incongruencias contra fechas existentes', async () => {
    const res = await fetch(`${baseUrl}/works/${createdWorkId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        end_date: '2026-10-01', // start_date actual es 2026-10-15
      }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /works/:id debe eliminar el recurso con 204 y quedar inaccesible (404)', async () => {
    const deleteRes = await fetch(`${baseUrl}/works/${createdWorkId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    expect(deleteRes.status).toBe(204);

    const verifyRes = await fetch(`${baseUrl}/works/${createdWorkId}`);
    expect(verifyRes.status).toBe(404);
  });
});
