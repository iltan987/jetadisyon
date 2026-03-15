import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type AuthenticatedRequest } from '../types/request.types';

export const AccessToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.accessToken) {
      throw new Error(
        '@AccessToken() requires SupabaseAuthGuard (not a @Public() route)',
      );
    }
    return request.accessToken;
  },
);
