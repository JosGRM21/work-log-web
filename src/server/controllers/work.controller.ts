import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { workService } from '../services/work.service.js';
import {
  parseListWorksQuery,
  validateCreateWorkInput,
  validateUpdateWorkInput,
} from '../validators/work.validator.js';

export class WorkController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = parseListWorksQuery(req.query as Record<string, unknown>);
      const result = await workService.listWorks(parsedQuery);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await workService.getWorkById(String(id));
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
      const result = await workService.createWork(req.user.id, validatedInput);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validatedInput = validateUpdateWorkInput(req.body ?? {});
      const result = await workService.updateWork(String(id), validatedInput);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await workService.deleteWork(String(id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const workController = new WorkController();
