import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { verifyPassword } from '../utils/password.js';
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '../utils/session.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body ?? {};

      if (!identifier || !password) {
        throw AppError.badRequest('El identificador y la contraseña son obligatorios.');
      }

      const normalizedEmail = String(identifier).trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw AppError.unauthorized('Credenciales inválidas. Compruebe el correo y la contraseña.');
      }

      const passwordMatches = await verifyPassword(String(password), user.passwordHash);

      if (!passwordMatches) {
        throw AppError.unauthorized('Credenciales inválidas. Compruebe el correo y la contraseña.');
      }

      const token = createSessionToken(user.id, user.email);
      res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

      res.status(200).json({
        message: 'Sesión iniciada con éxito',
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { maxAge: _, ...cookieOptions } = getSessionCookieOptions();

      res.clearCookie(SESSION_COOKIE_NAME, {
        ...cookieOptions,
        maxAge: 0,
        expires: new Date(0),
      });

      res.status(200).json({
        message: 'Sesión cerrada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(200).json({
          authenticated: false,
          user: null,
        });
        return;
      }

      res.status(200).json({
        authenticated: true,
        user: {
          id: req.user.id,
          name: req.user.fullName,
          email: req.user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
