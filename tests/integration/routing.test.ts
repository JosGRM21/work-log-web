import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../../src/server/app.js';

describe('Routing Boundaries & Catch-all (Integration)', () => {
  let server: Server;
  let rootUrl: string;

  beforeAll(async () => {
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const address = server.address() as AddressInfo;
    rootUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('debe devolver 404 en formato JSON para rutas inexistentes bajo /api', async () => {
    const response = await fetch(`${rootUrl}/api/endpoint-que-no-existe`);
    const json = (await response.json()) as { error?: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/json/);
    expect(json.error?.code).toBe('NOT_FOUND');
    expect(json.error?.message).toContain('Ruta de API no encontrada');
  });

  it('debe devolver 404 en formato JSON para métodos POST en rutas de API no registradas', async () => {
    const response = await fetch(`${rootUrl}/api/v1/rutas-desconocidas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });
    const json = (await response.json()) as { error?: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/json/);
    expect(json.error?.code).toBe('NOT_FOUND');
    expect(json.error?.message).toContain('Ruta de API no encontrada: POST');
  });

  it('debe devolver 404 en formato JSON si se solicita un archivo estático inexistente en /uploads', async () => {
    const response = await fetch(`${rootUrl}/uploads/archivo-inexistente.png`);
    const json = (await response.json()) as { error?: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/json/);
    expect(json.error?.code).toBe('NOT_FOUND');
    expect(json.error?.message).toContain('Archivo no encontrado');
  });

  it('debe devolver 404 en formato JSON para cualquier otra ruta no resuelta en desarrollo/test', async () => {
    const response = await fetch(`${rootUrl}/ruta-totalmente-aleatoria`);
    const json = (await response.json()) as { error?: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/json/);
    expect(json.error?.code).toBe('NOT_FOUND');
    expect(json.error?.message).toContain('Recurso no encontrado');
  });
});
