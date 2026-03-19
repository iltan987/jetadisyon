import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js';
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
    .transform((v) => v || undefined)
    .refine((v) => !v || isValidPhoneNumber(v), {
      error: 'Valid phone number required (e.g., +905551234567)',
    })
    .transform((v) => (v ? parsePhoneNumberWithError(v).format('E.164') : v)),
});

export type CreateTenantDto = z.infer<typeof createTenantSchema>;
