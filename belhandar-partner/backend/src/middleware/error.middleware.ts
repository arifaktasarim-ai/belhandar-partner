import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route bulunamadi: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // Prisma unique constraint vb. beklenmeyen hatalar
  // eslint-disable-next-line no-console
  console.error('[UNHANDLED ERROR]', err);

  return res.status(500).json({
    success: false,
    message: 'Beklenmeyen bir sunucu hatasi olustu.',
    stack: env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
  });
}
