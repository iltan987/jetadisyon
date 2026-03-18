import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type AuthenticatedRequest } from '../types/request.types';

export const JwtClaims = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Record<string, unknown> => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.jwtClaims ?? {};
  },
);
