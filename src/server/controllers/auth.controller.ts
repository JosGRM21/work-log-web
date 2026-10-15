import type { Request, Response, NextFunction } from 'express';
import { authService as defaultAuthService, type AuthService } from '../services/auth.service.js';
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from '../utils/session.js';

export class AuthController {
  constructor(private readonly service: AuthService = defaultAuthService) {}

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body ?? {};
      const { token, user } = await this.service.authenticateUser(identifier, password);

      res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

      res.status(200).json({
        message: 'Sesión iniciada con éxito',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME];
      this.service.revokeSession(token);

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
