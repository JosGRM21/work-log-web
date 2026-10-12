import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { apiRouter } from './routes/index.js';
import { authenticate } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Exposición pública de multimedia para entorno local
const uploadDir = path.resolve(process.cwd(), './uploads');
app.use('/uploads', express.static(uploadDir));

// Middleware de identificación de sesión
app.use(authenticate);

// API v1
app.use('/api/v1', apiRouter);

// Manejo unificado de errores
app.use(errorHandler);
