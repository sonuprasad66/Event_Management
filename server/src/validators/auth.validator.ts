import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});
