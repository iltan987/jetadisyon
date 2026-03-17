import type { SystemRole, TenantRole } from './roles.types';

export interface Profile {
  id: string;
  fullName: string;
  role: SystemRole;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembership {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  createdAt: string;
}
