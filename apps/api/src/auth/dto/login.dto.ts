import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Valid email required' }),
  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters' }),
});

export type LoginDto = z.infer<typeof loginSchema>;
