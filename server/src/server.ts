import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './sockets/socketManager';
import prisma from './config/db';
import { env } from './config/env';

const httpServer = http.createServer(app);
initSocket(httpServer);

async function start() {
  await prisma.$connect();
  console.log('Database connected');

  httpServer.listen(parseInt(env.PORT), () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
