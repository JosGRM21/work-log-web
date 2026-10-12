import { Router } from 'express';
import { mediaController } from '../controllers/media.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const mediaRouter = Router();

// Endpoint protegido: Eliminación individual de un recurso multimedia (RF-MEDIA-04)
mediaRouter.delete('/:id', requireAuth, (req, res, next) => mediaController.delete(req, res, next));
