import type { Enums } from './database.types';

export type SystemRole = Enums<'system_role'>;
export type TenantRole = Enums<'tenant_role'>;
export type AnyRole = SystemRole | TenantRole;

export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const satisfies Record<string, SystemRole>;

export const TENANT_ROLES = {
  OWNER: 'owner',
  STAFF: 'staff',
  EMPLOYEE: 'employee',
} as const satisfies Record<string, TenantRole>;
