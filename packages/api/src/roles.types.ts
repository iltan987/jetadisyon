export type AppRole = 'admin' | 'tenant_owner' | 'tenant_staff';

export const APP_ROLES = {
  ADMIN: 'admin',
  TENANT_OWNER: 'tenant_owner',
  TENANT_STAFF: 'tenant_staff',
} as const satisfies Record<string, AppRole>;
