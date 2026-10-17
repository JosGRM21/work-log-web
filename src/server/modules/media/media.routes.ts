import { Router } from 'express';
import { mediaController } from './media.controller.js';
import { requireAuth } from '../../core/middlewares/auth.middleware.js';

export const mediaRouter = Router();

// Endpoint protegido: Subida/actualización de miniatura física de un recurso multimedia
mediaRouter.put('/:id/thumbnail', requireAuth, (req, res, next) =>
  mediaController.uploadThumbnail(req, res, next),
);

// Endpoint protegido: Eliminación individual de un recurso multimedia (RF-MEDIA-04)
mediaRouter.delete('/:id', requireAuth, (req, res, next) => mediaController.delete(req, res, next));
