import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../../src/server/app.js';
import { prisma } from '../../src/server/infra/db/client.js';

describe('Security Verification (Phase 7 - QA & Hardening)', () => {
  let server: Server;
  let baseUrl: string;
  let sessionCookie = '';

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
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  describe('Atributos de Cookie de Sesión', () => {
    it('debe contener HttpOnly y SameSite=Lax en la cabecera Set-Cookie', async () => {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'admin@empresa.com',
          password: 'PasswordSegura123!',
        }),
      });

      const setCookie = loginRes.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      const lower = setCookie!.toLowerCase();
      expect(lower).toContain('httponly');
      expect(lower).toContain('samesite=lax');
      expect(lower).toContain('path=/');
    });
  });

  describe('Protección contra Inyección y Manipulación de Parámetros Foráneos', () => {
    it('debe rechazar o sanitizar payloads con campos desconocidos e inyecciones de control', async () => {
      const res = await fetch(`${baseUrl}/works`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          title: 'Trabajo con Intento de Inyección',
          status: 'pending',
          reference_date: '2026-10-12',
          // Campos maliciosos / foráneos
          id: '00000000-0000-0000-0000-000000000000',
          user_id: 'fake-admin-uuid',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: '2020-01-01T00:00:00.000Z',
          role: 'superuser',
          isAdmin: true,
          "'; DROP TABLE work_items; --": 'payload',
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as { id: string };

      // Verificar que el ID generado fue generado por el sistema y no por el cliente malicioso
      expect(json.id).not.toBe('00000000-0000-0000-0000-000000000000');

      // Limpieza
      await fetch(`${baseUrl}/works/${json.id}`, {
        method: 'DELETE',
        headers: { Cookie: sessionCookie },
      });
    });

    it('debe bloquear cadenas SQL / Script malformadas en campos con validación estricta de estado', async () => {
      const res = await fetch(`${baseUrl}/works`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          title: 'Trabajo con estado SQL injection',
          status: "' OR '1'='1",
          reference_date: '2026-10-12',
        }),
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as { error?: { code: string } };
      expect(json.error?.code).toBe('BAD_REQUEST');
    });

    it('debe rechazar fechas con inyección o formato corrupto', async () => {
      const res = await fetch(`${baseUrl}/works`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          title: 'Trabajo con fecha maliciosa',
          status: 'pending',
          reference_date: '<script>alert("xss")</script>',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Protección contra Tokens de Sesión Adulterados', () => {
    it('debe rechazar token de sesión con firma inválida', async () => {
      const forgedCookie = 'session_id=eyJ1c2VySWQiOiJhZG1pbiJ9.invalidsignature123';
      const res = await fetch(`${baseUrl}/works`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: forgedCookie,
        },
        body: JSON.stringify({
          title: 'Intento de falsificación',
          status: 'pending',
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});
