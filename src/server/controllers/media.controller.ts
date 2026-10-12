import type { Request, Response, NextFunction } from 'express';
import { mediaService } from '../services/media.service.js';

export class MediaController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await mediaService.uploadMedia(String(id), req);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await mediaService.deleteMedia(String(id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();
