import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import compression from 'compression';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './core/middlewares/error-handler.middleware.js';
import { AppError } from './core/errors/app-error.js';

export const app = express();

app.set('trust proxy', 1);

app.use(compression());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

const uploadDir = path.resolve(process.cwd(), './uploads');
app.use(
  '/uploads',
  express.static(uploadDir, {
    maxAge: '1y',
    immutable: true,
  }),
);

app.use('/api/v1', apiRouter);

// Cierre estricto de la frontera /api (404 JSON para cualquier verbo en /api o /api/*)
app.all('/api{/*splat}', (req, _res, next) => {
  next(AppError.notFound(`Ruta de API no encontrada: ${req.method} ${req.originalUrl}`));
});

// Cierre estricto de uploads si el archivo estático no existe
app.all('/uploads{/*splat}', (req, _res, next) => {
  next(AppError.notFound(`Archivo no encontrado: ${req.originalUrl}`));
});

// Servir frontend compilado en producción (assets inmutables y no-cache para index.html)
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(process.cwd(), './dist');
  app.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }),
  );

  app.all('/assets{/*splat}', (req, _res, next) => {
    next(AppError.notFound(`Asset no encontrado: ${req.originalUrl}`));
  });

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  // Sintaxis nativa de Express 5 para SPA fallback
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Catch-all 404 agnóstico de verbo HTTP para cualquier otro recurso no resuelto
app.use((req, _res, next) => {
  next(AppError.notFound(`Recurso no encontrado: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);
