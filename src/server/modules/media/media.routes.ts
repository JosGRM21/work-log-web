import { Router } from 'express';
import { mediaController } from './media.controller.js';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';
import { mediaRateLimiter } from '../../core/middlewares/rate-limit.middleware.js';

export const mediaRouter = Router();

// Endpoint protegido: Subida/actualización de miniatura física de un recurso multimedia
mediaRouter.put('/:id/thumbnail', requireAuth, mediaRateLimiter, (req, res, next) =>
  mediaController.uploadThumbnail(req, res, next),
);

// Endpoint protegido: Eliminación individual de un recurso multimedia (RF-MEDIA-04)
mediaRouter.delete('/:id', requireAuth, mediaRateLimiter, (req, res, next) =>
  mediaController.delete(req, res, next),
);
