import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const rawConnectionString = process.env.DATABASE_URL;
const isSsl = Boolean(
  rawConnectionString?.includes('sslmode=require') || process.env.NODE_ENV === 'production',
);

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

const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
const sslCa = process.env.DATABASE_SSL_CA;

const pool = new Pool({
  connectionString,
  ...(isSsl
    ? {
      ssl: {
        rejectUnauthorized,
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