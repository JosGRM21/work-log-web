import type { Request, Response, NextFunction } from 'express';
import {
  mediaService as defaultMediaService,
  type MediaService,
} from './media.service.js';

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

  async presign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { files } = req.body ?? {};
      const result = await this.service.presignMedia(String(id), files);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { files } = req.body ?? {};
      const result = await this.service.confirmMedia(String(id), files);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async uploadThumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        res.status(400).json({ error: { message: 'El contenido de la miniatura está vacío.' } });
        return;
      }
      const mimeType = req.headers['content-type'] || 'image/webp';
      const result = await this.service.uploadThumbnail(String(id), buffer, mimeType);
      res.status(200).json(result);
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
