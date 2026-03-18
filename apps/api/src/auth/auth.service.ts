import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@supabase/supabase-js';
import { PinoLogger } from 'nestjs-pino';

import type { SystemRole, TenantRole } from '@repo/api';

import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { SetInitialPasswordDto } from './dto/set-initial-password.dto';

@Injectable()
export class AuthService {
  private readonly appUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
  }

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
        mustChangePassword: user.user_metadata?.must_change_password === true,
        user: {
          id: user.id,
          email: user.email,
          systemRole: (user.app_metadata.system_role as SystemRole) ?? null,
          tenantRole: (user.app_metadata.tenant_role as TenantRole) ?? null,
          tenantId: (user.app_metadata.tenant_id as string) ?? null,
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
      throw new BadRequestException({
        code: 'AUTH.INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }

    // Update password and clear must_change_password flag atomically
    const { error: updateError } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(userId, {
        password: dto.newPassword,
        user_metadata: { must_change_password: null },
      });

    if (updateError) {
      throw new InternalServerErrorException({
        code: 'AUTH.PASSWORD_UPDATE_FAILED',
        message: 'Failed to update password',
      });
    }

    // Re-authenticate with new password to get fresh tokens (old refresh token
    // is invalidated by the password change, so the client can't refreshSession)
    const { data: newSession, error: reAuthError } = await this.supabaseService
      .createAuthClient()
      .auth.signInWithPassword({ email, password: dto.newPassword });

    if (reAuthError || !newSession.session) {
      this.logger.warn({ userId }, 'Password changed but re-auth failed');
      return {
        data: {
          message: 'Password changed successfully',
          accessToken: null,
          refreshToken: null,
        },
      };
    }

    this.logger.info({ userId }, 'Password changed successfully');

    return {
      data: {
        message: 'Password changed successfully',
        accessToken: newSession.session.access_token,
        refreshToken: newSession.session.refresh_token,
      },
    };
  }

  async setInitialPassword(
    userId: string,
    email: string,
    userMetadata: Record<string, unknown>,
    dto: SetInitialPasswordDto,
  ) {
    // Verify user has invitation_pending flag
    if (userMetadata?.invitation_pending !== true) {
      throw new BadRequestException({
        code: 'AUTH.NOT_INVITATION_USER',
        message: 'This endpoint is only for invited users',
      });
    }

    // Set password and clear invitation_pending flag
    const { error: updateError } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(userId, {
        password: dto.newPassword,
        user_metadata: { invitation_pending: null },
      });

    if (updateError) {
      throw new InternalServerErrorException({
        code: 'AUTH.SET_PASSWORD_FAILED',
        message: 'Failed to set password',
      });
    }

    // Re-authenticate with new password to get fresh tokens
    const { data: newSession, error: reAuthError } = await this.supabaseService
      .createAuthClient()
      .auth.signInWithPassword({ email, password: dto.newPassword });

    if (reAuthError || !newSession.session) {
      this.logger.warn({ userId }, 'Password set but re-auth failed');
      return {
        data: {
          accessToken: null,
          refreshToken: null,
        },
      };
    }

    this.logger.info({ userId }, 'Initial password set successfully');

    return {
      data: {
        accessToken: newSession.session.access_token,
        refreshToken: newSession.session.refresh_token,
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
        systemRole: (user.app_metadata.system_role as SystemRole) ?? null,
        tenantRole: (user.app_metadata.tenant_role as TenantRole) ?? null,
        tenantId: (user.app_metadata.tenant_id as string) ?? null,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { data: linkData, error } = await this.supabaseService
      .getClient()
      .auth.admin.generateLink({ type: 'recovery', email: dto.email });

    if (error) {
      const status = error.status ?? 0;
      if (status >= 500 || status === 0) {
        throw new InternalServerErrorException({
          code: 'AUTH.SERVICE_UNAVAILABLE',
          message: 'Authentication service temporarily unavailable',
        });
      }
      // User not found or other client error — no email leak
      this.logger.debug(
        { email: dto.email },
        'Forgot password: user not found or error',
      );
      return {
        data: { message: 'If an account exists, a reset email was sent' },
      };
    }

    // Skip users with pending invitation
    if (linkData.user.user_metadata?.invitation_pending === true) {
      this.logger.debug(
        { email: dto.email },
        'Forgot password: invitation pending, skipping',
      );
      return {
        data: { message: 'If an account exists, a reset email was sent' },
      };
    }

    // Best-effort email send
    try {
      await this.sendRecoveryEmail(dto.email, linkData.properties.hashed_token);
    } catch (emailError) {
      this.logger.error(
        { emailError, email: dto.email },
        'Failed to send password reset email',
      );
    }

    return {
      data: { message: 'If an account exists, a reset email was sent' },
    };
  }

  async resetPassword(
    userId: string,
    email: string,
    jwtClaims: Record<string, unknown>,
    dto: ResetPasswordDto,
  ) {
    // AMR check: ensure session was established via recovery link (OTP).
    // Supabase JWT amr claim is AMREntry[] | string[] (RFC-8176 allows both).
    const amr = jwtClaims.amr as Array<{ method: string } | string> | undefined;
    const hasOtpAmr =
      Array.isArray(amr) &&
      amr.some((entry) =>
        typeof entry === 'string' ? entry === 'otp' : entry.method === 'otp',
      );
    if (!hasOtpAmr) {
      throw new ForbiddenException({
        code: 'AUTH.RECOVERY_SESSION_REQUIRED',
        message: 'Password reset requires authentication via a recovery link',
      });
    }

    // Update password and clear must_change_password flag
    const { error: updateError } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(userId, {
        password: dto.newPassword,
        user_metadata: { must_change_password: null },
      });

    if (updateError) {
      throw new InternalServerErrorException({
        code: 'AUTH.PASSWORD_RESET_FAILED',
        message: 'Failed to reset password',
      });
    }

    // Re-authenticate with new password to get fresh tokens
    const { data: newSession, error: reAuthError } = await this.supabaseService
      .createAuthClient()
      .auth.signInWithPassword({ email, password: dto.newPassword });

    if (reAuthError || !newSession.session) {
      this.logger.warn({ userId }, 'Password reset but re-auth failed');
      return {
        data: {
          message: 'Password reset successfully',
          accessToken: null,
          refreshToken: null,
        },
      };
    }

    this.logger.info({ userId }, 'Password reset successfully');

    return {
      data: {
        message: 'Password reset successfully',
        accessToken: newSession.session.access_token,
        refreshToken: newSession.session.refresh_token,
      },
    };
  }

  async adminSendResetEmail(requestingUser: User, targetUserId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.admin.getUserById(targetUserId);

    if (error || !data.user) {
      throw new NotFoundException({
        code: 'AUTH.USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    await this.authorizeAdminAction(requestingUser, targetUserId);

    const targetEmail = data.user.email;
    if (!targetEmail) {
      throw new InternalServerErrorException({
        code: 'AUTH.USER_NOT_FOUND',
        message: 'User email not available',
      });
    }

    if (data.user.user_metadata?.invitation_pending === true) {
      throw new BadRequestException({
        code: 'AUTH.INVITATION_PENDING',
        message:
          'User has not set their initial password yet. Resend invitation instead.',
      });
    }

    // Generate fresh recovery link and send email
    const { data: linkData, error: linkError } = await this.supabaseService
      .getClient()
      .auth.admin.generateLink({
        type: 'recovery',
        email: targetEmail,
      });

    if (linkError || !linkData.properties) {
      throw new InternalServerErrorException({
        code: 'AUTH.SERVICE_UNAVAILABLE',
        message: 'Failed to generate recovery link',
      });
    }

    try {
      await this.sendRecoveryEmail(
        targetEmail,
        linkData.properties.hashed_token,
      );
    } catch (error) {
      this.logger.error(
        { error, targetUserId },
        'Failed to send password reset email',
      );
      throw new InternalServerErrorException({
        code: 'AUTH.EMAIL_SEND_FAILED',
        message: 'Failed to send password reset email',
      });
    }

    this.logger.info(
      { requestingUserId: requestingUser.id, targetUserId },
      'Admin sent password reset email',
    );

    return { data: { message: 'Password reset email sent' } };
  }

  async adminForcePasswordChange(requestingUser: User, targetUserId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.admin.getUserById(targetUserId);

    if (error || !data.user) {
      throw new NotFoundException({
        code: 'AUTH.USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    await this.authorizeAdminAction(requestingUser, targetUserId);

    if (data.user.user_metadata?.invitation_pending === true) {
      throw new BadRequestException({
        code: 'AUTH.INVITATION_PENDING',
        message:
          'User has not set their initial password yet. Resend invitation instead.',
      });
    }

    const { error: updateError } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(targetUserId, {
        user_metadata: { must_change_password: true },
      });

    if (updateError) {
      throw new InternalServerErrorException({
        code: 'AUTH.FORCE_RESET_FAILED',
        message: 'Failed to force password change',
      });
    }

    this.logger.info(
      { requestingUserId: requestingUser.id, targetUserId },
      'Force password change set',
    );

    return {
      data: {
        message: 'User will be required to change password on next login',
      },
    };
  }

  private async authorizeAdminAction(
    requestingUser: User,
    targetUserId: string,
  ) {
    // Cannot target yourself
    if (requestingUser.id === targetUserId) {
      throw new ForbiddenException({
        code: 'AUTH.FORBIDDEN',
        message: 'You cannot perform this action on your own account',
      });
    }

    // Platform admin can target any user
    if (requestingUser.app_metadata.system_role === 'admin') {
      return;
    }

    // Tenant owner can target staff/employees in their tenant (not other owners)
    if (requestingUser.app_metadata.tenant_role === 'owner') {
      const ownerTenantId = requestingUser.app_metadata.tenant_id as string;

      const { data: membership, error: membershipError } =
        await this.supabaseService
          .getClient()
          .from('tenant_memberships')
          .select('role')
          .eq('user_id', targetUserId)
          .eq('tenant_id', ownerTenantId)
          .single();

      if (membershipError || !membership) {
        throw new ForbiddenException({
          code: 'AUTH.FORBIDDEN',
          message: 'You can only reset passwords for users in your tenant',
        });
      }

      if ((membership as { role: string }).role === 'owner') {
        throw new ForbiddenException({
          code: 'AUTH.FORBIDDEN',
          message: 'You cannot reset the password of another owner',
        });
      }

      return;
    }

    throw new ForbiddenException({
      code: 'AUTH.FORBIDDEN',
      message: 'Insufficient permissions',
    });
  }

  private async sendRecoveryEmail(email: string, hashedToken: string) {
    const resetLink = `${this.appUrl}/auth/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
    await this.mailService.sendPasswordResetEmail(email, resetLink);
  }
}
