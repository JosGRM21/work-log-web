import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { workService as defaultWorkService, type WorkService } from './works.service.js';
import {
  parseListWorksQuery,
  validateCreateWorkInput,
  validateUpdateWorkInput,
} from './works.validator.js';

export class WorkController {
  constructor(private readonly service: WorkService = defaultWorkService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = parseListWorksQuery(req.query as Record<string, unknown>);
      const result = await this.service.listWorks(parsedQuery);
      res.setHeader(
        'Cache-Control',
        'public, max-age=0, must-revalidate, stale-while-revalidate=30',
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.getWorkById(String(id));
      res.setHeader(
        'Cache-Control',
        'public, max-age=0, must-revalidate, stale-while-revalidate=30',
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('La solicitud requiere una sesión activa.');
      }
      const validatedInput = validateCreateWorkInput(req.body ?? {});
      const result = await this.service.createWork(req.user.id, validatedInput);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validatedInput = validateUpdateWorkInput(req.body ?? {});
      const result = await this.service.updateWork(String(id), validatedInput);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.deleteWork(String(id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const workController = new WorkController();
