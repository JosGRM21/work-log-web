import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { workRouter } from './work.routes.js';
import { mediaRouter } from './media.routes.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { prisma } from '../db/client.js';

export const apiRouter = Router();

// Módulos principales
apiRouter.use('/auth', authRouter);
apiRouter.use('/works', workRouter);
apiRouter.use('/media', mediaRouter);

// Health check para monitoreo y orquestadores (Render/Docker)
apiRouter.get('/health', async (_req, res) => {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Math.round((performance.now() - start) * 100) / 100;
    const memUsage = process.memoryUsage();
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        latency_ms: dbLatencyMs,
      },
      memory: {
        rss_bytes: memUsage.rss,
        heap_used_bytes: memUsage.heapUsed,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
      memory: {
        rss_bytes: process.memoryUsage().rss,
      },
    });
  }
});

// Ruta protegida de diagnóstico
apiRouter.get('/auth/protected-ping', requireAuth, (req, res) => {
  res.status(200).json({
    message: 'Acceso autorizado al recurso protegido',
    userId: req.user?.id,
  });
});
