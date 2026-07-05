import { z } from 'zod';
import { DateTime } from 'luxon';

export const createEventSchema = z.object({
  title: z.string().min(1).max(150).trim(),
  description: z.string().min(1).max(5000).trim(),
  categoryId: z.string().uuid(),
  publishDateTime: z.string().min(1),
  sourceTimezone: z.string().refine((tz) => {
    try {
      return DateTime.now().setZone(tz).isValid;
    } catch {
      return false;
    }
  }, 'Invalid IANA timezone'),
});
