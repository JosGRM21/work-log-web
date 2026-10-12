import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { workRouter } from './work.routes.js';
import { mediaRouter } from './media.routes.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const apiRouter = Router();

// Módulos principales
apiRouter.use('/auth', authRouter);
apiRouter.use('/works', workRouter);
apiRouter.use('/media', mediaRouter);

// Health check para monitoreo y orquestadores (Render/Docker)
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta protegida de diagnóstico
apiRouter.get('/auth/protected-ping', requireAuth, (req, res) => {
  res.status(200).json({
    message: 'Acceso autorizado al recurso protegido',
    userId: req.user?.id,
  });
});
