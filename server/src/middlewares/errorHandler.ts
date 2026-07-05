import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { sendError } from '../utils/response';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    sendError(res, 'A record with that value already exists', 409);
    return;
  }

  console.error(err);
  sendError(res, 'Internal server error', 500);
}
