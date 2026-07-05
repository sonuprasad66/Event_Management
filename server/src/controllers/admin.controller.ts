import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import { createUserSchema } from '../validators/user.validator';
import { createEventSchema } from '../validators/event.validator';

function getEventStatus(event: { publishAtUtc: Date; deletedAt: Date | null }): string {
  if (event.deletedAt) return 'deleted';
  return event.publishAtUtc <= new Date() ? 'published' : 'waiting';
}

export const adminListEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10', status, categoryId, userId, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as Record<string, string>;
  const timezone = (req.headers['x-timezone'] as string) || 'UTC';
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const now = new Date();

  let where: any = {};

  if (status === 'published') where = { deletedAt: null, publishAtUtc: { lte: now } };
  else if (status === 'waiting') where = { deletedAt: null, publishAtUtc: { gt: now } };
  else if (status === 'deleted') where = { deletedAt: { not: null } };

  if (categoryId) where.categoryId = categoryId;
  if (userId) where.createdById = userId;
  if (search) {
    where.OR = [{ title: { contains: search } }, { description: { contains: search } }];
  }

  const validSortFields = ['publishAtUtc', 'createdAt', 'title'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
      include: {
        category: true,
        createdBy: { select: { id: true, username: true, email: true, role: true } },
        deletedBy: { select: { id: true, username: true } },
        media: true,
      },
    }),
    prisma.event.count({ where }),
  ]);

  const eventsWithStatus = events.map((e) => {
    const dt = DateTime.fromJSDate(e.publishAtUtc).setZone(timezone);
    return {
      ...e,
      status: getEventStatus(e),
      publishAtLocal: dt.toFormat("yyyy-MM-dd'T'HH:mm:ss"),
      timezoneName: timezone,
      timezoneOffset: dt.toFormat('ZZ'),
    };
  });

  sendSuccess(res, eventsWithStatus, 'Admin events fetched', 200, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const adminSoftDelete = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = (req as any).user;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) { sendError(res, 'Event not found', 404); return; }
  if (event.deletedAt) { sendError(res, 'Event already deleted', 409); return; }

  const updated = await prisma.event.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });
  sendSuccess(res, { id: updated.id, deletedAt: updated.deletedAt }, 'Event soft deleted');
});

export const adminPermanentDelete = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const event = await prisma.event.findUnique({ where: { id }, include: { media: true } });
  if (!event) { sendError(res, 'Event not found', 404); return; }
  if (!event.deletedAt) { sendError(res, 'Event must be soft deleted first', 400); return; }

  // Delete local media files
  const uploadDir = path.join(process.cwd(), env.UPLOAD_DIR);
  for (const media of event.media) {
    const filename = path.basename(media.url);
    const filepath = path.join(uploadDir, filename);
    try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch (e) { console.error('File delete error:', e); }
  }

  await prisma.event.delete({ where: { id } });
  sendSuccess(res, null, 'Event permanently deleted');
});

export const adminRestoreEvent = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) { sendError(res, 'Event not found', 404); return; }
  if (!event.deletedAt) { sendError(res, 'Event is not deleted', 400); return; }

  const updated = await prisma.event.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  });
  sendSuccess(res, updated, 'Event restored');
});

export const adminStats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const [total, published, waiting, deleted, totalUsers] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { deletedAt: null, publishAtUtc: { lte: now } } }),
    prisma.event.count({ where: { deletedAt: null, publishAtUtc: { gt: now } } }),
    prisma.event.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count(),
  ]);

  sendSuccess(res, { total, published, waiting, deleted, totalUsers }, 'Stats fetched');
});

// ── User management ────────────────────────────────────────────────────────────

export const adminListUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = search
    ? { OR: [{ username: { contains: search } }, { email: { contains: search } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { events: true, sessions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, users, 'Users fetched', 200, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const adminCreateUser = asyncHandler(async (req: Request, res: Response) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    sendError(res, 'Validation failed', 422, result.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const { username, email, password, role, timezone } = result.data;

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) { sendError(res, 'Username is already taken', 409); return; }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) { sendError(res, 'Email is already registered', 409); return; }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, email, passwordHash, role, timezone },
    select: {
      id: true, username: true, email: true,
      role: true, timezone: true, createdAt: true,
    },
  });

  sendSuccess(res, user, 'User created successfully', 201);
});

// ── Admin event creation ───────────────────────────────────────────────────────

export const adminCreateEvent = asyncHandler(async (req: Request, res: Response) => {
  const result = createEventSchema.safeParse(req.body);
  if (!result.success) {
    const files = (req.files as Express.Multer.File[]) ?? [];
    files.forEach((f) => { try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch {} });
    sendError(res, 'Validation failed', 422, result.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const { title, description, categoryId, publishDateTime, sourceTimezone } = result.data;
  const admin = (req as any).user;
  const files = (req.files as Express.Multer.File[]) ?? [];

  if (files.length > 5) {
    files.forEach((f) => { try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch {} });
    sendError(res, 'Maximum 5 images allowed', 400);
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    files.forEach((f) => { try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch {} });
    sendError(res, 'Category not found', 404);
    return;
  }

  const publishAtUtc = DateTime.fromISO(publishDateTime, { zone: sourceTimezone }).toUTC().toJSDate();
  const baseUrl = `http://localhost:${env.PORT}`;

  try {
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: { title, description, categoryId, createdById: admin.id, publishAtUtc, sourceTimezone },
      });

      if (files.length > 0) {
        await tx.eventMedia.createMany({
          data: files.map((f) => ({
            eventId: newEvent.id,
            url: `${baseUrl}/uploads/${path.basename(f.path)}`,
            publicId: path.basename(f.path, path.extname(f.path)),
            fileName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
          })),
        });
      }

      return tx.event.findUnique({
        where: { id: newEvent.id },
        include: {
          category: true,
          createdBy: { select: { id: true, username: true, email: true } },
          media: true,
        },
      });
    });

    sendSuccess(res, event, 'Event created successfully', 201);
  } catch (err) {
    files.forEach((f) => { try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch {} });
    throw err;
  }
});
