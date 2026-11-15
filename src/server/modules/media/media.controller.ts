import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import {
  mediaService as defaultMediaService,
  type MediaService,
} from './media.service.js';
import { MAX_THUMBNAIL_SIZE_BYTES } from './media.validator.js';

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
      const declaredLength = Number(req.headers['content-length']);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_THUMBNAIL_SIZE_BYTES) {
        req.resume();
        throw AppError.payloadTooLarge(
          'El tamaño de la miniatura excede el límite máximo permitido de 2 MB.',
        );
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;

      for await (const chunk of req) {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        totalBytes += buf.length;
        if (totalBytes > MAX_THUMBNAIL_SIZE_BYTES) {
          req.resume();
          throw AppError.payloadTooLarge(
            'El tamaño de la miniatura excede el límite máximo permitido de 2 MB.',
          );
        }
        chunks.push(buf);
      }

      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        throw AppError.badRequest('El contenido de la miniatura está vacío.');
      }

      const result = await this.service.uploadThumbnail(String(id), buffer);
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
