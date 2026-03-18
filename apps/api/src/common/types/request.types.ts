import type { User } from '@supabase/supabase-js';
import { type Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: User;
  tenantId: string | null;
  accessToken: string;
  jwtClaims: Record<string, unknown>;
}
