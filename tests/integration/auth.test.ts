import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../../src/server/app.js';
import { prisma } from '../../src/server/infra/db/client.js';

describe('Auth & Session API (Integration)', () => {
  let server: Server;
  let baseUrl: string;
  let validSessionCookie = '';

  beforeAll(async () => {
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}/api/v1`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('debe rechazar credenciales incorrectas con 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@empresa.com',
        password: 'PasswordIncorrecta999!',
      }),
    });
    const json = (await res.json()) as { error?: { code: string } };

    expect(res.status).toBe(401);
    expect(json.error?.code).toBe('UNAUTHORIZED');
  });

  it('debe autenticar con credenciales correctas y emitir Set-Cookie seguro', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@empresa.com',
        password: 'PasswordSegura123!',
      }),
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie?.toLowerCase()).toContain('session_id=');
    expect(setCookie?.toLowerCase()).toContain('httponly');
    expect(setCookie?.toLowerCase()).toContain('samesite=lax');

    validSessionCookie = setCookie!.split(';')[0];
  });

  it('debe bloquear endpoint protegido sin sesión con 401', async () => {
    const res = await fetch(`${baseUrl}/auth/protected-ping`);
    expect(res.status).toBe(401);
  });

  it('debe permitir acceso al endpoint protegido con cookie válida', async () => {
    const res = await fetch(`${baseUrl}/auth/protected-ping`, {
      headers: { Cookie: validSessionCookie },
    });
    expect(res.status).toBe(200);
  });

  it('GET /auth/me debe retornar datos de usuario con sesión activa', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: validSessionCookie },
    });
    const json = (await res.json()) as { authenticated: boolean };
    expect(res.status).toBe(200);
    expect(json.authenticated).toBe(true);
  });

  it('POST /auth/logout debe revocar la cookie de sesión', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: validSessionCookie },
    });
    expect(res.status).toBe(200);

    const setCookie = (res.headers.get('set-cookie') ?? '').toLowerCase();
    const isRevoked =
      setCookie.includes('max-age=0') ||
      setCookie.includes('expires=thu, 01 jan 1970') ||
      setCookie.includes('expires=');
    expect(isRevoked).toBe(true);
  });

  it('GET /auth/me debe retornar authenticated: false tras cerrar sesión', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    const json = (await res.json()) as { authenticated: boolean };
    expect(res.status).toBe(200);
    expect(json.authenticated).toBe(false);
  });
});
