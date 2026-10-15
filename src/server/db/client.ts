import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const rawConnectionString = process.env.DATABASE_URL;
const isSsl = Boolean(
  rawConnectionString?.includes('sslmode=') || process.env.NODE_ENV === 'production',
);

const requiresStrictVerify = Boolean(
  rawConnectionString?.includes('sslmode=verify-full') ||
  rawConnectionString?.includes('sslmode=verify-ca') ||
  process.env.DATABASE_SSL_CA ||
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
);

// pg-connection-string sobrescribe el objeto ssl si encuentra sslmode en la URL,
// forzando verificación completa y fallando con el certificado autofirmado del pooler de Supabase.
let connectionString = rawConnectionString;
if (rawConnectionString && isSsl) {
  try {
    const url = new URL(rawConnectionString);
    url.searchParams.delete('sslmode');
    connectionString = url.toString();
  } catch {
    connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/, '');
  }
}

const sslCa = process.env.DATABASE_SSL_CA;

const pool = new Pool({
  connectionString,
  ...(isSsl
    ? {
        ssl: {
          rejectUnauthorized: requiresStrictVerify,
          ...(sslCa ? { ca: sslCa } : {}),
        },
      }
    : {}),
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
