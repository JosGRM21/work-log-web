import crypto from 'node:crypto';
import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'session_id';
export const SESSION_EXPIRATION_DAYS = 7;
export const SESSION_EXPIRATION_MS = SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET debe estar definido en el entorno y tener al menos 32 caracteres.',
    );
  }
  return secret;
}

export function createSessionToken(userId: string, email: string): string {
  const secret = getSessionSecret();
  const payload: SessionPayload = {
    userId,
    email,
    exp: Date.now() + SESSION_EXPIRATION_MS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [payloadBase64, providedSignature] = token.split('.');
    if (!payloadBase64 || !providedSignature) {
      return null;
    }

    const secret = getSessionSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(providedSignature, 'utf8');

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return null;
    }

    const payloadRaw = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadRaw) as SessionPayload;

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: SESSION_EXPIRATION_MS,
  };
}
