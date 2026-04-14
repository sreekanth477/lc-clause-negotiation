import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Request validation failed',
      statusCode: 400,
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Standard errors
  if (err instanceof Error) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    const message = statusCode < 500 ? err.message : 'An internal server error occurred';

    if (process.env.NODE_ENV !== 'production') {
      console.error('[Error]', err.message, err.stack);
    } else {
      console.error('[Error]', err.message);
    }

    res.status(statusCode).json({
      error: err.name ?? 'InternalServerError',
      message,
      statusCode,
    });
    return;
  }

  // Unknown errors
  console.error('[UnknownError]', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
};
