import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const appMetadata = request.user?.app_metadata;
    const systemRole = appMetadata?.system_role as string | undefined;
    const tenantRole = appMetadata?.tenant_role as string | undefined;

    const hasRole =
      (systemRole && requiredRoles.includes(systemRole)) ||
      (tenantRole && requiredRoles.includes(tenantRole));

    if (!hasRole) {
      throw new ForbiddenException({
        code: 'AUTH.INSUFFICIENT_ROLE',
        message: 'Insufficient permissions',
      });
    }

    return true;
  }
}
