import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../../modules/auth/session.js';

function resolveSessionUser(req: Request): void {
  if (req.user !== undefined) {
    return;
  }

  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    req.user = undefined;
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    req.user = undefined;
    return;
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
    fullName: payload.fullName,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  resolveSessionUser(req);
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    resolveSessionUser(req);
    if (!req.user) {
      throw AppError.unauthorized('La solicitud requiere una sesión activa.');
    }
    next();
  } catch (error) {
    next(error);
  }
}
