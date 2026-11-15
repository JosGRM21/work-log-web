import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 128;

// Hash constante precomputado para mitigar enumeración de usuarios por timing attack
const DUMMY_PASSWORD_HASH =
  'scrypt:0123456789abcdef0123456789abcdef:' + 'a'.repeat(KEY_LENGTH * 2);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(plainText: string, hashedPassword: string): Promise<boolean> {
  if (!plainText || plainText.length > MAX_PASSWORD_LENGTH) {
    return false;
  }

  if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
    return bcrypt.compare(plainText, hashedPassword);
  }

  if (hashedPassword.startsWith('scrypt:')) {
    const [, salt, keyHex] = hashedPassword.split(':');
    if (!salt || !keyHex) return false;
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedKey = (await scryptAsync(plainText, salt, keyBuffer.length)) as Buffer;
    return timingSafeEqual(keyBuffer, derivedKey);
  }

  return false;
}

export async function performDummyPasswordCheck(plainText: string): Promise<void> {
  const safeInput =
    typeof plainText === 'string' ? plainText.slice(0, MAX_PASSWORD_LENGTH) : 'dummy';
  await verifyPassword(safeInput || 'dummy', DUMMY_PASSWORD_HASH);
}


