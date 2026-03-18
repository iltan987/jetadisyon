import type { SystemRole, TenantRole } from './roles.types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  systemRole: SystemRole | null;
  tenantRole: TenantRole | null;
  tenantId: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
  confirmPassword: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  system_role: SystemRole;
  tenant_role: TenantRole | null;
  tenant_id: string | null;
  exp: number;
  iat: number;
}
