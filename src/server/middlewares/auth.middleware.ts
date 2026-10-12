import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../utils/session.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      req.user = undefined;
    } else {
      req.user = user;
    }
  } catch {
    req.user = undefined;
  }

  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw AppError.unauthorized('La solicitud requiere una sesión activa.');
  }
  next();
}
