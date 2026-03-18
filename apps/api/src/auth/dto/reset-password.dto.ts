import { z } from 'zod';

// SYNC: Frontend mirrors this at apps/web/src/app/reset-password/page.tsx
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters' }),
    confirmPassword: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
