import type { AppRole } from './roles.types';

export interface Profile {
  id: string;
  fullName: string;
  role: AppRole;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembership {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: string;
}
