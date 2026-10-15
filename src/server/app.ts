import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { apiRouter } from './routes/index.js';
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

const uploadDir = path.resolve(process.cwd(), './uploads');
app.use('/uploads', express.static(uploadDir));

app.use('/api/v1', apiRouter);

app.use(errorHandler);
