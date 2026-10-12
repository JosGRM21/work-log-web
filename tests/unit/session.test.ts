import { describe, it, expect, beforeAll } from 'vitest';
import { createSessionToken, verifySessionToken } from '../../src/server/utils/session.js';

describe('Session Utility (Unit)', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'clave_de_prueba_segura_de_al_menos_32_caracteres_vitest';
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
});
