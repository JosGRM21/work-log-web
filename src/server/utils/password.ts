import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashedPassword);
}
