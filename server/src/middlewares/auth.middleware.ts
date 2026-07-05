import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { sendError } from '../utils/response';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const session = await prisma.session.findFirst({
      where: { id: payload.sessionId, tokenId: payload.tokenId, isActive: true },
      include: { user: true },
    });

    if (!session) {
      sendError(res, 'Session expired or invalid', 401);
      return;
    }

    (req as any).user = {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      role: session.user.role,
      timezone: session.user.timezone,
    };
    (req as any).session = { id: session.id, tokenId: session.tokenId };

    next();
  } catch {
    sendError(res, 'Unauthorized', 401);
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || user.role !== role) {
      sendError(res, 'Forbidden', 403);
      return;
    }
    next();
  };
}
