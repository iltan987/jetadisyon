import { z } from 'zod';

export const createTenantSchema = z.object({
  businessName: z
    .string()
    .min(2, { error: 'Business name must be at least 2 characters' })
    .max(100, { error: 'Business name must be at most 100 characters' }),
  ownerFullName: z
    .string()
    .min(2, { error: 'Owner name must be at least 2 characters' })
    .max(100, { error: 'Owner name must be at most 100 characters' }),
  ownerEmail: z.email({ error: 'Valid email required' }),
  contactPhone: z
    .string()
    .max(20, { error: 'Phone number must be at most 20 characters' })
    .optional()
    .transform((v) => v || undefined),
});

export type CreateTenantDto = z.infer<typeof createTenantSchema>;
