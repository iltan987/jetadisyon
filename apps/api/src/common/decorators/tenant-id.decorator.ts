import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type AuthenticatedRequest } from '../types/request.types';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tenantId ?? null;
  },
);
