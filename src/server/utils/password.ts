import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(plainText: string, hashedPassword: string): Promise<boolean> {
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

