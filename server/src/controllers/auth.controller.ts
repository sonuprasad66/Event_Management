import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/db';
import { env } from '../config/env';
import { loginSchema } from '../validators/auth.validator';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { emitForceLogout } from '../sockets/socketManager';

function parseUserAgent(ua: string = ''): { browser: string; device: string } {
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  const device = /Mobile|Android|iPhone|iPad/.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, device };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    sendError(res, 'Validation failed', 422, result.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const { username, password } = result.data;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    sendError(res, 'Invalid username or password', 401);
    return;
  }

  // Invalidate all existing active sessions for this user
  const activeSessions = await prisma.session.findMany({
    where: { userId: user.id, isActive: true },
  });

  if (activeSessions.length > 0) {
    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false, invalidatedAt: new Date() },
    });
    // Emit force logout to existing sessions
    try {
      await emitForceLogout(user.id);
    } catch {
      // Socket.IO might not be ready yet, ignore
    }
  }

  const tokenId = uuidv4();
  const { browser, device } = parseUserAgent(req.headers['user-agent']);
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0';

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenId,
      browser,
      device,
      ipAddress,
      isActive: true,
    },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role, sessionId: session.id, tokenId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  sendSuccess(res, {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
    },
  }, 'Login successful');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const sessionData = (req as any).session;
  await prisma.session.update({
    where: { id: sessionData.id },
    data: { isActive: false, invalidatedAt: new Date(), socketId: null },
  });
  sendSuccess(res, null, 'Logged out successfully');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const sessionData = (req as any).session;

  const session = await prisma.session.findUnique({
    where: { id: sessionData.id },
    select: { id: true, browser: true, device: true, ipAddress: true, createdAt: true },
  });

  sendSuccess(res, { user, session });
});
