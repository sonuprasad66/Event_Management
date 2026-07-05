import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import {
  adminListEvents,
  adminSoftDelete,
  adminPermanentDelete,
  adminRestoreEvent,
  adminStats,
  adminListUsers,
  adminCreateUser,
  adminCreateEvent,
} from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', adminStats);

// Events
router.get('/events', adminListEvents);
router.post('/events', upload.array('photos', 5), adminCreateEvent);
router.delete('/events/:id/soft', adminSoftDelete);
router.delete('/events/:id/permanent', adminPermanentDelete);
router.patch('/events/:id/restore', adminRestoreEvent);

// Users
router.get('/users', adminListUsers);
router.post('/users', adminCreateUser);

export default router;
