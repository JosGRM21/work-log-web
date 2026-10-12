export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: unknown[];

  constructor(statusCode: number, errorCode: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details: unknown[] = []): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Acceso no autorizado'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Permisos insuficientes'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Recurso no encontrado'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static payloadTooLarge(message: string, details: unknown[] = []): AppError {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', message, details);
  }
}
