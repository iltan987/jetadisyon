import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, { error: 'Current password must be at least 8 characters' }),
    newPassword: z
      .string()
      .min(8, { error: 'New password must be at least 8 characters' }),
    confirmPassword: z
      .string()
      .min(8, { error: 'Confirm password must be at least 8 characters' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
