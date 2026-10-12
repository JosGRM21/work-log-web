import { Router } from 'express';
import { workController } from '../controllers/work.controller.js';
import { mediaController } from '../controllers/media.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const workRouter = Router();

// Endpoints públicos de consulta
workRouter.get('/', (req, res, next) => workController.list(req, res, next));
workRouter.get('/:id', (req, res, next) => workController.getById(req, res, next));

// Endpoints protegidos para mutaciones de trabajo
workRouter.post('/', requireAuth, (req, res, next) => workController.create(req, res, next));
workRouter.patch('/:id', requireAuth, (req, res, next) => workController.update(req, res, next));
workRouter.delete('/:id', requireAuth, (req, res, next) => workController.delete(req, res, next));

// Endpoint protegido: Carga de fotos y videos asociados a un trabajo (RF-MEDIA-01, RF-MEDIA-02)
workRouter.post('/:id/media', requireAuth, (req, res, next) =>
  mediaController.upload(req, res, next),
);
