import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async login(dto: LoginDto) {
    const { data, error } = await this.supabaseService
      .createAuthClient()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) {
      // status 0 = network/connection failure, 5xx = server error
      const status = error.status ?? 0;
      if (status === 0 || status >= 500) {
        throw new InternalServerErrorException({
          code: 'AUTH.SERVICE_UNAVAILABLE',
          message: 'Authentication service is temporarily unavailable',
        });
      }
      throw new UnauthorizedException({
        code: 'AUTH.INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (!data.session) {
      throw new UnauthorizedException({
        code: 'AUTH.INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const { session, user } = data;

    return {
      data: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          role: user.app_metadata.user_role ?? null,
          tenantId: user.app_metadata.tenant_id ?? null,
        },
      },
    };
  }

  async logout(userId: string) {
    const { error } = await this.supabaseService
      .getClient()
      .auth.admin.signOut(userId);

    if (error) {
      throw new UnauthorizedException({
        code: 'AUTH.LOGOUT_FAILED',
        message: 'Failed to log out',
      });
    }

    return { data: { message: 'Logged out successfully' } };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabaseService
      .createAuthClient()
      .auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      throw new UnauthorizedException({
        code: 'AUTH.SESSION_EXPIRED',
        message: 'Session expired, please log in again',
      });
    }

    return {
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    };
  }

  async getMe(userId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.admin.getUserById(userId);

    if (error || !data.user) {
      throw new UnauthorizedException({
        code: 'AUTH.USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const user = data.user;
    return {
      data: {
        id: user.id,
        email: user.email,
        role: user.app_metadata.user_role ?? null,
        tenantId: user.app_metadata.tenant_id ?? null,
      },
    };
  }
}
