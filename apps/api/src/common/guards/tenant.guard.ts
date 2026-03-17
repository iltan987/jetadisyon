import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const systemRole = request.user?.app_metadata?.system_role;

    // Admin users are not tenant-scoped — allow through with null tenantId
    if (systemRole === 'admin') {
      request.tenantId = null;
      return true;
    }

    // Non-admin users must have a tenant_id in their JWT claims
    const tenantId = request.user?.app_metadata?.tenant_id as
      | string
      | null
      | undefined;

    if (!tenantId) {
      throw new ForbiddenException({
        code: 'AUTH.TENANT_MISSING',
        message: 'Tenant context required',
      });
    }

    request.tenantId = tenantId;
    return true;
  }
}
