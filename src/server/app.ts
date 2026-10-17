import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import compression from 'compression';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

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

  app.use(
    express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(errorHandler);
