import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../core/middlewares/auth.middleware.js';
import { loginRateLimiter } from '../../core/middlewares/rate-limit.middleware.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, (req, res, next) =>
  authController.login(req, res, next),
);
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
authRouter.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));
