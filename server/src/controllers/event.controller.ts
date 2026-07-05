import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DateTime } from 'luxon';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createEventSchema } from '../validators/event.validator';
import { env } from '../config/env';

function getTimezoneInfo(utcDate: Date, timezone: string) {
  const dt = DateTime.fromJSDate(utcDate).setZone(timezone);
  return {
    publishAtUtc: utcDate.toISOString(),
    publishAtLocal: dt.toFormat("yyyy-MM-dd'T'HH:mm:ss"),
    timezoneName: timezone,
    timezoneOffset: dt.toFormat('ZZ'),
  };
}

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const result = createEventSchema.safeParse(req.body);
  if (!result.success) {
    // cleanup uploaded files on validation error
    const files = req.files as Express.Multer.File[];
    if (files) files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    sendError(res, 'Validation failed', 422, result.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const { title, description, categoryId, publishDateTime, sourceTimezone } = result.data;
  const user = (req as any).user;
  const files = (req.files as Express.Multer.File[]) || [];

  if (files.length > 5) {
    files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    sendError(res, 'Maximum 5 images allowed', 400);
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    sendError(res, 'Category not found', 404);
    return;
  }

  const publishAtUtc = DateTime.fromISO(publishDateTime, { zone: sourceTimezone }).toUTC().toJSDate();

  const baseUrl = `http://localhost:${env.PORT}`;

  try {
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title,
          description,
          categoryId,
          createdById: user.id,
          publishAtUtc,
          sourceTimezone,
        },
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
        include: { category: true, createdBy: { select: { id: true, username: true, email: true } }, media: true },
      });
    });

    sendSuccess(res, event, 'Event created', 201);
  } catch (err) {
    files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    throw err;
  }
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10', search, categoryId, sortBy = 'publishAtUtc', sortOrder = 'desc' } = req.query as Record<string, string>;
  const timezone = (req.headers['x-timezone'] as string) || 'UTC';
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const now = new Date();

  const where: any = {
    deletedAt: null,
    publishAtUtc: { lte: now },
  };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;

  const validSortFields = ['publishAtUtc', 'createdAt', 'title'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'publishAtUtc';

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
      include: {
        category: true,
        createdBy: { select: { id: true, username: true, email: true } },
        media: true,
      },
    }),
    prisma.event.count({ where }),
  ]);

  const eventsWithTz = events.map((e) => ({
    ...e,
    ...getTimezoneInfo(e.publishAtUtc, timezone),
  }));

  sendSuccess(res, eventsWithTz, 'Events fetched', 200, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const timezone = (req.headers['x-timezone'] as string) || 'UTC';
  const now = new Date();

  const event = await prisma.event.findFirst({
    where: { id, deletedAt: null, publishAtUtc: { lte: now } },
    include: {
      category: true,
      createdBy: { select: { id: true, username: true, email: true } },
      media: true,
    },
  });

  if (!event) { sendError(res, 'Event not found', 404); return; }

  sendSuccess(res, { ...event, ...getTimezoneInfo(event.publishAtUtc, timezone) }, 'Event fetched');
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = (req as any).user;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) { sendError(res, 'Event not found', 404); return; }
  if (event.deletedAt) { sendError(res, 'Event already deleted', 409); return; }

  if (user.role !== 'ADMIN' && event.createdById !== user.id) {
    sendError(res, 'Forbidden', 403);
    return;
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  sendSuccess(res, { id: updated.id, deletedAt: updated.deletedAt }, 'Event deleted');
});
