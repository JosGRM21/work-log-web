import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  getSessionCookieOptions,
} from '../../src/server/modules/auth/session.js';

describe('Session Utility (Unit)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSameSite = process.env.SESSION_COOKIE_SAME_SITE;
  const originalSecure = process.env.SESSION_COOKIE_SECURE;

  beforeAll(() => {
    process.env.SESSION_SECRET = 'clave_de_prueba_segura_de_al_menos_32_caracteres_vitest';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSameSite === undefined) delete process.env.SESSION_COOKIE_SAME_SITE;
    else process.env.SESSION_COOKIE_SAME_SITE = originalSameSite;
    if (originalSecure === undefined) delete process.env.SESSION_COOKIE_SECURE;
    else process.env.SESSION_COOKIE_SECURE = originalSecure;
  });

  it('debe generar y verificar un token de sesión legítimo', () => {
    const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const email = 'admin@empresa.com';

    const token = createSessionToken(userId, email);
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(userId);
    expect(payload?.email).toBe(email);
    expect(payload?.exp).toBeGreaterThan(Date.now());
  });

  it('debe rechazar tokens con firmas manipuladas', () => {
    const token = createSessionToken('user-1', 'test@test.com');
    const [payloadBase64, signature] = token.split('.');
    const tamperedToken = `${payloadBase64}.${signature}tampered`;

    expect(verifySessionToken(tamperedToken)).toBeNull();
  });

  it('debe rechazar tokens con formato malformado', () => {
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('token-invalido-sin-firma')).toBeNull();
  });

  it('debe usar SameSite=None y Secure en producción por defecto para soportar frontends cross-site (Cloudflare Pages)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_COOKIE_SAME_SITE;
    delete process.env.SESSION_COOKIE_SECURE;

    const opts = getSessionCookieOptions();
    expect(opts.sameSite).toBe('none');
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
  });

  it('debe usar SameSite=Lax fuera de producción y permitir override por SESSION_COOKIE_SAME_SITE', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SESSION_COOKIE_SAME_SITE;
    expect(getSessionCookieOptions().sameSite).toBe('lax');

    process.env.NODE_ENV = 'production';
    process.env.SESSION_COOKIE_SAME_SITE = 'lax';
    expect(getSessionCookieOptions().sameSite).toBe('lax');
  });
});
