import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const rawConnectionString = process.env.DATABASE_URL;
const isSsl = Boolean(
  rawConnectionString?.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production'
);

// pg-connection-string sobrescribe ssl si encuentra sslmode=require en la URL,
// forzando verificación completa y fallando con el certificado autofirmado del pooler de Supabase.
// Removemos sslmode de la URL y pasamos ssl explícito al objeto Pool.
let connectionString = rawConnectionString;
if (rawConnectionString && isSsl) {
  try {
    const url = new URL(rawConnectionString);
    url.searchParams.delete('sslmode');
    connectionString = url.toString();
  } catch {
    // Si no es un formato URL parseable directo, fallback simple
    connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/, '');
  }
}

const pool = new Pool({
  connectionString,
  ...(isSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
