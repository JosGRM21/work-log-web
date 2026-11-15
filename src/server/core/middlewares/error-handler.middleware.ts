import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

interface HttpParserError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  const parserErr = err as HttpParserError;
  const status = parserErr.statusCode ?? parserErr.status;

  if (status === 413 || parserErr.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'El cuerpo de la solicitud excede el tamaño máximo permitido.',
        details: [],
      },
    });
    return;
  }

  if (err instanceof SyntaxError && status === 400 && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'El cuerpo JSON enviado tiene un formato inválido.',
        details: [],
      },
    });
    return;
  }

  console.error('Unhandled server error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado en el servidor.',
      details: [],
    },
  });
}
