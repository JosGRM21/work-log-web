import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../utils/session.js';

async function resolveSessionUser(req: Request): Promise<void> {
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
    req.user = user ?? undefined;
  } catch {
    req.user = undefined;
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  await resolveSessionUser(req);
  next();
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await resolveSessionUser(req);
    if (!req.user) {
      throw AppError.unauthorized('La solicitud requiere una sesión activa.');
    }
    next();
  } catch (error) {
    next(error);
  }
}