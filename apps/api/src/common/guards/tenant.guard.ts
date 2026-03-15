import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.user?.app_metadata?.user_role;

    // Admin users are not tenant-scoped — allow through with null tenantId
    if (userRole === 'admin') {
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
