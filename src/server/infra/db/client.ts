import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function createDatabasePool(): Pool {
  const rawConnectionString = process.env.DATABASE_URL;

  let cleanConnectionString = rawConnectionString;
  let isSsl = process.env.NODE_ENV === 'production';
  let requiresStrictVerify = false;

  if (rawConnectionString) {
    try {
      const parsed = new URL(rawConnectionString);
      const sslMode = parsed.searchParams.get('sslmode')?.toLowerCase();
      const sslParam = parsed.searchParams.get('ssl')?.toLowerCase();

      if (sslMode || sslParam === 'true' || sslParam === '1' || process.env.NODE_ENV === 'production') {
        isSsl = true;
      }

      if (
        sslMode === 'verify-full' ||
        sslMode === 'verify-ca' ||
        Boolean(process.env.DATABASE_SSL_CA) ||
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
      ) {
        requiresStrictVerify = true;
      }

      if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false') {
        requiresStrictVerify = false;
      }

      // Strip SSL query parameters from the URL passed to pg.Pool.
      // In node-postgres, `pg-connection-string` parses `sslmode=require` and defaults
      // to `rejectUnauthorized: true` (verify-full), overwriting any custom `ssl` object
      // passed to new Pool({ ... }). This causes "self-signed certificate in certificate chain"
      // when connecting to cloud-managed poolers (e.g., Supabase, Neon, AWS RDS).
      parsed.searchParams.delete('sslmode');
      parsed.searchParams.delete('ssl');
      parsed.searchParams.delete('uselibpqcompat');
      cleanConnectionString = parsed.toString();
    } catch {
      isSsl = Boolean(
        rawConnectionString.includes('sslmode=') || process.env.NODE_ENV === 'production',
      );
      requiresStrictVerify = Boolean(
        rawConnectionString.includes('sslmode=verify-full') ||
        rawConnectionString.includes('sslmode=verify-ca') ||
        process.env.DATABASE_SSL_CA ||
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
      );
      if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false') {
        requiresStrictVerify = false;
      }
    }
  }

  const sslCa = process.env.DATABASE_SSL_CA;

  return new Pool({
    connectionString: cleanConnectionString,
    max: Number(process.env.DATABASE_POOL_MAX) || (process.env.NODE_ENV === 'production' ? 10 : 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
    idle_in_transaction_session_timeout: 15000,
    ...(isSsl
      ? {
          ssl: {
            rejectUnauthorized: requiresStrictVerify,
            ...(sslCa ? { ca: sslCa } : {}),
          },
        }
      : {}),
  });
}

export const pool = createDatabasePool();

pool.on('error', (err) => {
  console.error('[pg-pool] Error inesperado en cliente inactivo de PostgreSQL:', err);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
