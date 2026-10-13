import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate, requireAuth } from '../middlewares/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/login', (req, res, next) => authController.login(req, res, next));
authRouter.post('/logout', requireAuth, (req, res, next) => authController.logout(req, res, next));
authRouter.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));