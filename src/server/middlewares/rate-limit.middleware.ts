import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetTime: number }>();

  // Limpieza periódica de IPs expiradas para evitar fugas de memoria
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits.entries()) {
      if (now > val.resetTime) {
        hits.delete(key);
      }
    }
  }, 60_000);
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = hits.get(ip);
    if (!record || now > record.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(
        AppError.tooManyRequests(
          options.message || 'Demasiadas solicitudes. Por favor, intente nuevamente más tarde.',
        ),
      );
    }

    record.count++;
    return next();
  };
}

// 8 intentos cada 15 minutos en login (relajado a 100 en tests para no bloquear suites)
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 8,
  message: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.',
});

// 30 peticiones cada 10 minutos en rutas multimedia (relajado a 100 en tests)
export const mediaRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 30,
  message: 'Límite de operaciones multimedia alcanzado. Por favor, intente de nuevo en 10 minutos.',
});
