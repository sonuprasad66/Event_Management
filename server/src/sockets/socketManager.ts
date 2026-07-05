import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { env } from '../config/env';
import { JwtPayload } from '../types';

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token as string;
      if (!token) return next(new Error('Authentication error'));

      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      const session = await prisma.session.findFirst({
        where: { id: payload.sessionId, isActive: true },
      });
      if (!session) return next(new Error('Session invalid'));

      (socket as any).userId = payload.userId;
      (socket as any).sessionId = payload.sessionId;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const sessionId = (socket as any).sessionId as string;

    socket.join(`user:${userId}`);

    await prisma.session.update({
      where: { id: sessionId },
      data: { socketId: socket.id },
    });

    socket.on('disconnect', async () => {
      const sess = await prisma.session.findUnique({ where: { id: sessionId } });
      if (sess && sess.isActive) {
        await prisma.session.update({ where: { id: sessionId }, data: { socketId: null } });
      }
    });
  });

  return io;
}

export function getIo(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export async function emitForceLogout(userId: string, excludeSessionId?: string): Promise<void> {
  const ioInstance = getIo();
  ioInstance.to(`user:${userId}`).emit('force_logout', {
    message: 'You have logged in from another browser. You have been logged out.',
    reason: 'NEW_LOGIN_DETECTED',
  });
}
