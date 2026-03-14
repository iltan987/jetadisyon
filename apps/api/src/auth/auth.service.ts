import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { SupabaseService } from '../supabase/supabase.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: PinoLogger,
  ) {}

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
        mustChangePassword:
          user.user_metadata?.must_change_password === true,
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

  async changePassword(userId: string, email: string, dto: ChangePasswordDto) {
    // Verify current password by re-authenticating
    const { error: signInError } = await this.supabaseService
      .createAuthClient()
      .auth.signInWithPassword({
        email,
        password: dto.currentPassword,
      });

    if (signInError) {
      throw new UnauthorizedException({
        code: 'AUTH.INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }

    // Update password via admin API
    const { error: updateError } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(userId, {
        password: dto.newPassword,
      });

    if (updateError) {
      throw new InternalServerErrorException({
        code: 'AUTH.PASSWORD_UPDATE_FAILED',
        message: 'Failed to update password',
      });
    }

    // Clear must_change_password flag (setting to null deletes the key)
    const { error: metadataError } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(userId, {
        user_metadata: { must_change_password: null },
      });

    if (metadataError) {
      this.logger.warn(
        { userId },
        'Password updated but failed to clear must_change_password flag',
      );
    }

    this.logger.info({ userId }, 'Password changed successfully');

    return { data: { message: 'Password changed successfully' } };
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
