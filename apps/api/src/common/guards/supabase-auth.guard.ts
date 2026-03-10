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
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException({
        code: 'AUTH.TOKEN_INVALID',
        message: 'Invalid or expired token',
      });
    }

    // getUser() validates the token against DB but returns the stored user data.
    // custom_access_token_hook injects user_role/tenant_id into JWT claims only,
    // so decode the already-validated JWT to get the hook-injected app_metadata.
    const claims = this.decodeJwtPayload(token);

    request.user = {
      ...data.user,
      app_metadata: claims.app_metadata ?? data.user.app_metadata,
    };
    return true;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(Buffer.from(payload!, 'base64url').toString());
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH.TOKEN_INVALID',
        message: 'Invalid or expired token',
      });
    }
  }
}
