import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { createCategory, getCategories, getCategoryTree, updateCategory, deleteCategory } from '../controllers/category.controller';

const router = Router();

router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.post('/', authenticate, requireRole('ADMIN'), createCategory);
router.patch('/:id', authenticate, requireRole('ADMIN'), updateCategory);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteCategory);

export default router;
