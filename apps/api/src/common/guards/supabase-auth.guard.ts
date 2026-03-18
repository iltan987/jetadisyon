import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SupabaseService } from '../../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'AUTH.TOKEN_MISSING',
        message: 'Authentication token required',
      });
    }

    const token = authHeader.substring(7);
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException({
        code: 'AUTH.TOKEN_INVALID',
        message: 'Invalid or expired token',
      });
    }

    // getUser() returns stored user data where app_metadata lacks the
    // hook-injected system_role/tenant_role/tenant_id. Read them from the verified JWT claims.
    const { data: claimsData } = await client.auth.getClaims(token);

    const claims: Record<string, unknown> = claimsData?.claims ?? {};
    request.user = {
      ...data.user,
      app_metadata:
        (claims.app_metadata as Record<string, unknown>) ??
        data.user.app_metadata,
    };
    request.accessToken = token;
    request.jwtClaims = claims;
    return true;
  }
}
