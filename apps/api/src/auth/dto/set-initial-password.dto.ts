import { z } from 'zod';

// SYNC: Frontend has a mirrored schema with Turkish error messages
// at apps/web/src/app/set-password/page.tsx
export const setInitialPasswordSchema = z
  .object({
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
  });

export type SetInitialPasswordDto = z.infer<typeof setInitialPasswordSchema>;
