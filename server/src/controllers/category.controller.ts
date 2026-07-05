import { Request, Response } from 'express';
import prisma from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import slugify from 'slugify';

function buildTree(categories: any[], parentId: string | null = null): any[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, children: buildTree(categories, c.id) }));
}

async function getDescendantIds(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({ where: { parentId: categoryId } });
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const desc = await getDescendantIds(child.id);
    ids.push(...desc);
  }
  return ids;
}

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = createCategorySchema.safeParse(req.body);
  if (!result.success) {
    sendError(res, 'Validation failed', 422, result.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const { name, parentId } = result.data;
  const user = (req as any).user;

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) { sendError(res, 'Parent category not found', 404); return; }
  }

  const slug = slugify(name, { lower: true, strict: true });

  const existing = await prisma.category.findFirst({
    where: { name, parentId: parentId ?? null },
  });
  if (existing) { sendError(res, 'Category with this name already exists under the same parent', 409); return; }

  const category = await prisma.category.create({
    data: { name, slug, parentId: parentId ?? null, createdById: user.id },
    include: { parent: true, children: true },
  });

  sendSuccess(res, category, 'Category created', 201);
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { parentId, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = parentId ? { parentId } : {};
  const [categories, total] = await Promise.all([
    prisma.category.findMany({ where, skip, take: parseInt(limit), include: { parent: true, _count: { select: { children: true, events: true } } } }),
    prisma.category.count({ where }),
  ]);

  sendSuccess(res, categories, 'Categories fetched', 200, {
    page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const getCategoryTree = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { events: true, children: true } } },
  });
  const tree = buildTree(categories);
  sendSuccess(res, tree, 'Category tree fetched');
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = updateCategorySchema.safeParse(req.body);
  if (!result.success) {
    sendError(res, 'Validation failed', 422, result.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) { sendError(res, 'Category not found', 404); return; }

  const { name, parentId } = result.data;

  if (parentId !== undefined) {
    if (parentId === id) { sendError(res, 'Category cannot be its own parent', 400); return; }
    if (parentId) {
      const descendants = await getDescendantIds(id);
      if (descendants.includes(parentId)) {
        sendError(res, 'Cannot set a descendant as parent', 400);
        return;
      }
    }
  }

  const updateData: any = {};
  if (name) { updateData.name = name; updateData.slug = slugify(name, { lower: true, strict: true }); }
  if (parentId !== undefined) updateData.parentId = parentId;

  const updated = await prisma.category.update({ where: { id }, data: updateData, include: { parent: true } });
  sendSuccess(res, updated, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const existing = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { children: true, events: true } } } });
  if (!existing) { sendError(res, 'Category not found', 404); return; }

  if (existing._count.children > 0) { sendError(res, 'Cannot delete category with child categories', 400); return; }
  if (existing._count.events > 0) { sendError(res, 'Cannot delete category with events', 400); return; }

  await prisma.category.delete({ where: { id } });
  sendSuccess(res, null, 'Category deleted');
});
