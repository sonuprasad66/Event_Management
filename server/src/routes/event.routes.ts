import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { createEvent, listEvents, getEventById, deleteEvent } from '../controllers/event.controller';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', listEvents);
router.get('/:id', getEventById);
router.post('/', authenticate, upload.array('photos', 5), createEvent);
router.delete('/:id', authenticate, deleteEvent);

export default router;
