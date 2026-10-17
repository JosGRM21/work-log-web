import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../utils/session.js';

const userCache = new Map<
  string,
  {
    user: {
      id: string;
      email: string;
      fullName: string;
      createdAt: Date;
      updatedAt: Date;
    };
    expiresAt: number;
  }
>();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_USER_CACHE_SIZE = 500;

function pruneUserCache(): void {
  const now = Date.now();
  for (const [key, val] of userCache.entries()) {
    if (now >= val.expiresAt) {
      userCache.delete(key);
    }
  }
  while (userCache.size >= MAX_USER_CACHE_SIZE) {
    const oldestKey = userCache.keys().next().value;
    if (oldestKey) {
      userCache.delete(oldestKey);
    } else {
      break;
    }
  }
}

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

  if (payload.fullName) {
    req.user = {
      id: payload.userId,
      email: payload.email,
      fullName: payload.fullName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return;
  }

  const cached = userCache.get(payload.userId);
  if (cached && Date.now() < cached.expiresAt) {
    req.user = cached.user;
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

    if (user) {
      if (userCache.size >= MAX_USER_CACHE_SIZE) {
        pruneUserCache();
      }
      userCache.set(payload.userId, {
        user,
        expiresAt: Date.now() + USER_CACHE_TTL_MS,
      });
      req.user = user;
    } else {
      req.user = undefined;
    }
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

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
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
