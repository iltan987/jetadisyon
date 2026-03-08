import type { AppRole } from './roles.types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole | null;
  tenantId: string | null;
}

export interface TokenPayload {
  sub: string;
  email: string;
  user_role: AppRole;
  tenant_id: string | null;
  exp: number;
  iat: number;
}
