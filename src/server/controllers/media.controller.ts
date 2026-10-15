import type { Request, Response, NextFunction } from 'express';
import {
  mediaService as defaultMediaService,
  type MediaService,
} from '../services/media.service.js';

export class MediaController {
  constructor(private readonly service: MediaService = defaultMediaService) {}

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.uploadMedia(String(id), req);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.deleteMedia(String(id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();
