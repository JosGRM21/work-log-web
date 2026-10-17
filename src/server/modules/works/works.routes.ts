import { Router } from 'express';
import { workController } from './works.controller.js';
import { mediaController } from '../media/media.controller.js';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';
import { mediaRateLimiter } from '../../core/middlewares/rate-limit.middleware.js';

export const workRouter = Router();

// Endpoints públicos de consulta
workRouter.get('/', (req, res, next) => workController.list(req, res, next));
workRouter.get('/:id', (req, res, next) => workController.getById(req, res, next));

// Endpoints protegidos para mutaciones de trabajo
workRouter.post('/', requireAuth, (req, res, next) => workController.create(req, res, next));
workRouter.patch('/:id', requireAuth, (req, res, next) => workController.update(req, res, next));
workRouter.delete('/:id', requireAuth, (req, res, next) => workController.delete(req, res, next));

// Endpoint protegido: Carga de fotos y videos asociados a un trabajo (RF-MEDIA-01, RF-MEDIA-02)
workRouter.post('/:id/media', requireAuth, mediaRateLimiter, (req, res, next) =>
  mediaController.upload(req, res, next),
);
workRouter.post('/:id/media/presign', requireAuth, mediaRateLimiter, (req, res, next) =>
  mediaController.presign(req, res, next),
);
workRouter.post('/:id/media/confirm', requireAuth, mediaRateLimiter, (req, res, next) =>
  mediaController.confirm(req, res, next),
);
