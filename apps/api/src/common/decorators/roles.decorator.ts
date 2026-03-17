import { SetMetadata } from '@nestjs/common';

import type { SystemRole, TenantRole } from '@repo/api';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (SystemRole | TenantRole)[]) =>
  SetMetadata(ROLES_KEY, roles);
