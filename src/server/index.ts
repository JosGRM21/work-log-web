import 'dotenv/config';
import { app } from './app.js';
import { prisma, pool } from './infra/db/client.js';

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor API iniciado en http://localhost:${PORT}`);
  console.log(`Endpoints base disponibles en http://localhost:${PORT}/api/v1`);
});

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[${signal}] Cerrando servidor HTTP y conexiones activas...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      await pool.end();
      console.log('Conexiones cerradas limpiamente.');
      process.exit(0);
    } catch (err) {
      console.error('Error al cerrar conexiones de base de datos:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Cierre forzado por timeout de 10s.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
