import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { User } from '@supabase/supabase-js';
import { PinoLogger } from 'nestjs-pino';

import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  const mockSupabaseClient = {
    auth: {
      admin: {
        signOut: jest.fn(),
        getUserById: jest.fn(),
        updateUserById: jest.fn(),
        generateLink: jest.fn(),
      },
    },
    from: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockAuthClient = {
    auth: {
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
    },
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    createAuthClient: jest.fn().mockReturnValue(mockAuthClient),
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'APP_URL') return 'http://localhost:3001';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient);
    mockSupabaseService.createAuthClient.mockReturnValue(mockAuthClient);
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
  });

  describe('login', () => {
    const loginDto = { email: 'admin@test.com', password: 'password123' };

    it('should use createAuthClient, not getClient', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
          },
          user: {
            id: 'user-id',
            email: 'admin@test.com',
            app_metadata: {
              system_role: 'admin',
              tenant_role: null,
              tenant_id: null,
            },
            user_metadata: {},
          },
        },
        error: null,
      });

      await service.login(loginDto);

      expect(mockSupabaseService.createAuthClient).toHaveBeenCalled();
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('should return tokens and user on successful login', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
          },
          user: {
            id: 'user-id',
            email: 'admin@test.com',
            app_metadata: {
              system_role: 'admin',
              tenant_role: null,
              tenant_id: null,
            },
            user_metadata: {},
          },
        },
        error: null,
      });

      const result = await service.login(loginDto);

      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe('refresh-token');
      expect(result.data.mustChangePassword).toBe(false);
      expect(result.data.user.email).toBe('admin@test.com');
      expect(result.data.user.systemRole).toBe('admin');
    });

    it('should return mustChangePassword true when flag is set', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
          },
          user: {
            id: 'user-id',
            email: 'owner@test.com',
            app_metadata: {
              system_role: 'user',
              tenant_role: 'owner',
              tenant_id: 'tenant-1',
            },
            user_metadata: { must_change_password: true },
          },
        },
        error: null,
      });

      const result = await service.login(loginDto);

      expect(result.data.mustChangePassword).toBe(true);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials', status: 400 },
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should use getClient, not createAuthClient', async () => {
      mockSupabaseClient.auth.admin.signOut.mockResolvedValue({ error: null });

      await service.logout('user-id');

      expect(mockSupabaseService.getClient).toHaveBeenCalled();
      expect(mockSupabaseService.createAuthClient).not.toHaveBeenCalled();
    });

    it('should return success on logout', async () => {
      mockSupabaseClient.auth.admin.signOut.mockResolvedValue({ error: null });

      const result = await service.logout('user-id');

      expect(result.data.message).toBe('Logged out successfully');
    });

    it('should throw UnauthorizedException on logout failure', async () => {
      mockSupabaseClient.auth.admin.signOut.mockResolvedValue({
        error: { message: 'Failed' },
      });

      await expect(service.logout('user-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshSession', () => {
    it('should use createAuthClient, not getClient', async () => {
      mockAuthClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          },
        },
        error: null,
      });

      await service.refreshSession('old-refresh');

      expect(mockSupabaseService.createAuthClient).toHaveBeenCalled();
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('should return new tokens on successful refresh', async () => {
      mockAuthClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          },
        },
        error: null,
      });

      const result = await service.refreshSession('old-refresh');

      expect(result.data.accessToken).toBe('new-access');
      expect(result.data.refreshToken).toBe('new-refresh');
    });

    it('should throw UnauthorizedException on expired refresh token', async () => {
      mockAuthClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' },
      });

      await expect(service.refreshSession('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getMe', () => {
    it('should use getClient, not createAuthClient', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-id',
            email: 'admin@test.com',
            app_metadata: {
              system_role: 'admin',
              tenant_role: null,
              tenant_id: null,
            },
          },
        },
        error: null,
      });

      await service.getMe('user-id');

      expect(mockSupabaseService.getClient).toHaveBeenCalled();
      expect(mockSupabaseService.createAuthClient).not.toHaveBeenCalled();
    });

    it('should return user profile', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-id',
            email: 'admin@test.com',
            app_metadata: {
              system_role: 'admin',
              tenant_role: null,
              tenant_id: null,
            },
          },
        },
        error: null,
      });

      const result = await service.getMe('user-id');

      expect(result.data.id).toBe('user-id');
      expect(result.data.email).toBe('admin@test.com');
      expect(result.data.systemRole).toBe('admin');
      expect(result.data.tenantId).toBeNull();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      await expect(service.getMe('bad-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    };

    it('should change password and return fresh tokens', async () => {
      mockAuthClient.auth.signInWithPassword
        .mockResolvedValueOnce({
          data: { session: {}, user: {} },
          error: null,
        }) // verify current password
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: 'new-access',
              refresh_token: 'new-refresh',
            },
            user: {},
          },
          error: null,
        }); // re-auth with new password
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await service.changePassword(
        'user-id',
        'owner@test.com',
        changePasswordDto,
      );

      expect(result.data.message).toBe('Password changed successfully');
      expect(result.data.accessToken).toBe('new-access');
      expect(result.data.refreshToken).toBe('new-refresh');
      expect(
        mockSupabaseClient.auth.admin.updateUserById,
      ).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        'user-id',
        {
          password: 'newpass456',
          user_metadata: { must_change_password: null },
        },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: 'user-id' },
        'Password changed successfully',
      );
    });

    it('should return null tokens when re-auth fails after password change', async () => {
      mockAuthClient.auth.signInWithPassword
        .mockResolvedValueOnce({
          data: { session: {}, user: {} },
          error: null,
        }) // verify current password
        .mockResolvedValueOnce({
          data: { session: null, user: null },
          error: { message: 'Re-auth failed' },
        }); // re-auth fails
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await service.changePassword(
        'user-id',
        'owner@test.com',
        changePasswordDto,
      );

      expect(result.data.message).toBe('Password changed successfully');
      expect(result.data.accessToken).toBeNull();
      expect(result.data.refreshToken).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { userId: 'user-id' },
        'Password changed but re-auth failed',
      );
    });

    it('should throw BadRequestException on wrong current password', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(
        service.changePassword('user-id', 'owner@test.com', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on update failure', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: {}, user: {} },
        error: null,
      });
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.changePassword('user-id', 'owner@test.com', changePasswordDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('setInitialPassword', () => {
    const setPasswordDto = {
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    };

    it('should set password and return fresh tokens', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          },
          user: {},
        },
        error: null,
      });

      const result = await service.setInitialPassword(
        'user-id',
        'owner@test.com',
        { invitation_pending: true },
        setPasswordDto,
      );

      expect(result.data.accessToken).toBe('new-access');
      expect(result.data.refreshToken).toBe('new-refresh');
      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        'user-id',
        {
          password: 'newpass456',
          user_metadata: { invitation_pending: null },
        },
      );
    });

    it('should reject if invitation_pending is not true', async () => {
      await expect(
        service.setInitialPassword(
          'user-id',
          'owner@test.com',
          {},
          setPasswordDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return null tokens when re-auth fails after password set', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Re-auth failed' },
      });

      const result = await service.setInitialPassword(
        'user-id',
        'owner@test.com',
        { invitation_pending: true },
        setPasswordDto,
      );

      expect(result.data.accessToken).toBeNull();
      expect(result.data.refreshToken).toBeNull();
    });

    it('should throw InternalServerErrorException on update failure', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.setInitialPassword(
          'user-id',
          'owner@test.com',
          { invitation_pending: true },
          setPasswordDto,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('forgotPassword', () => {
    const dto = { email: 'user@test.com' };

    it('should throw InternalServerErrorException on infrastructure error', async () => {
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable', status: 500 },
      });

      await expect(service.forgotPassword(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return success without sending email when user not found', async () => {
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { message: 'User not found', status: 404 },
      });

      const result = await service.forgotPassword(dto);

      expect(result.data.message).toBe(
        'If an account exists, a reset email was sent',
      );
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return success without sending email for invitation_pending user', async () => {
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { user_metadata: { invitation_pending: true } },
          properties: { hashed_token: 'token123' },
        },
        error: null,
      });

      const result = await service.forgotPassword(dto);

      expect(result.data.message).toBe(
        'If an account exists, a reset email was sent',
      );
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should send email and return success for valid user', async () => {
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { user_metadata: {} },
          properties: { hashed_token: 'token123' },
        },
        error: null,
      });
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(dto);

      expect(result.data.message).toBe(
        'If an account exists, a reset email was sent',
      );
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@test.com',
        expect.stringContaining('token123'),
      );
    });

    it('should return success even when email sending fails (best-effort)', async () => {
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { user_metadata: {} },
          properties: { hashed_token: 'token123' },
        },
        error: null,
      });
      mockMailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SMTP down'),
      );

      const result = await service.forgotPassword(dto);

      expect(result.data.message).toBe(
        'If an account exists, a reset email was sent',
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const dto = { newPassword: 'newpass123', confirmPassword: 'newpass123' };

    it('should throw ForbiddenException when AMR has no OTP method', async () => {
      const claims = { amr: [{ method: 'password', timestamp: 123 }] };

      await expect(
        service.resetPassword('user-id', 'user@test.com', claims, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when AMR is missing', async () => {
      await expect(
        service.resetPassword('user-id', 'user@test.com', {}, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reset password and return fresh tokens with OTP AMR', async () => {
      const claims = { amr: [{ method: 'otp', timestamp: 123 }] };
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          },
        },
        error: null,
      });

      const result = await service.resetPassword(
        'user-id',
        'user@test.com',
        claims,
        dto,
      );

      expect(result.data.accessToken).toBe('new-access');
      expect(result.data.refreshToken).toBe('new-refresh');
      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        'user-id',
        {
          password: 'newpass123',
          user_metadata: { must_change_password: null },
        },
      );
    });

    it('should handle string AMR entries (RFC-8176 alternate format)', async () => {
      const claims = { amr: ['otp'] };
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          },
        },
        error: null,
      });

      const result = await service.resetPassword(
        'user-id',
        'user@test.com',
        claims,
        dto,
      );

      expect(result.data.accessToken).toBe('new-access');
    });

    it('should throw InternalServerErrorException when password update fails', async () => {
      const claims = { amr: [{ method: 'otp', timestamp: 123 }] };
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.resetPassword('user-id', 'user@test.com', claims, dto),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should return null tokens when re-auth fails after reset', async () => {
      const claims = { amr: [{ method: 'otp', timestamp: 123 }] };
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Re-auth failed' },
      });

      const result = await service.resetPassword(
        'user-id',
        'user@test.com',
        claims,
        dto,
      );

      expect(result.data.accessToken).toBeNull();
      expect(result.data.refreshToken).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('adminSendResetEmail', () => {
    const adminUser = {
      id: 'admin-id',
      app_metadata: { system_role: 'admin' },
    } as unknown as User;

    const validTargetUser = {
      id: 'target-id',
      email: 'target@test.com',
      app_metadata: {},
      user_metadata: {},
    };

    it('should throw NotFoundException when target user not found', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      await expect(
        service.adminSendResetEmail(adminUser, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invitation_pending target', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            ...validTargetUser,
            user_metadata: { invitation_pending: true },
          },
        },
        error: null,
      });

      await expect(
        service.adminSendResetEmail(adminUser, 'target-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send reset email for valid admin request', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: validTargetUser },
        error: null,
      });
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'token123' } },
        error: null,
      });
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.adminSendResetEmail(adminUser, 'target-id');

      expect(result.data.message).toBe('Password reset email sent');
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'target@test.com',
        expect.stringContaining('token123'),
      );
    });

    it('should throw InternalServerErrorException when email sending fails', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: validTargetUser },
        error: null,
      });
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'token123' } },
        error: null,
      });
      mockMailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SMTP down'),
      );

      await expect(
        service.adminSendResetEmail(adminUser, 'target-id'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when link generation fails', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: validTargetUser },
        error: null,
      });
      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { message: 'Link generation failed' },
      });

      await expect(
        service.adminSendResetEmail(adminUser, 'target-id'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('adminForcePasswordChange', () => {
    const adminUser = {
      id: 'admin-id',
      app_metadata: { system_role: 'admin' },
    } as unknown as User;

    const validTargetUser = {
      id: 'target-id',
      email: 'target@test.com',
      app_metadata: {},
      user_metadata: {},
    };

    it('should throw NotFoundException when target user not found', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      await expect(
        service.adminForcePasswordChange(adminUser, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invitation_pending target', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            ...validTargetUser,
            user_metadata: { invitation_pending: true },
          },
        },
        error: null,
      });

      await expect(
        service.adminForcePasswordChange(adminUser, 'target-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set must_change_password for valid target', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: validTargetUser },
        error: null,
      });
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await service.adminForcePasswordChange(
        adminUser,
        'target-id',
      );

      expect(result.data.message).toBe(
        'User will be required to change password on next login',
      );
      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        'target-id',
        {
          user_metadata: { must_change_password: true },
        },
      );
    });

    it('should throw InternalServerErrorException on update failure', async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: validTargetUser },
        error: null,
      });
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        service.adminForcePasswordChange(adminUser, 'target-id'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('authorizeAdminAction (tested via adminForcePasswordChange)', () => {
    const validTargetUser = {
      id: 'target-id',
      email: 'target@test.com',
      app_metadata: {},
      user_metadata: {},
    };

    beforeEach(() => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: validTargetUser },
        error: null,
      });
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });
    });

    it('should prevent self-targeting', async () => {
      const selfUser = {
        id: 'target-id',
        app_metadata: { system_role: 'admin' },
      } as unknown as User;

      await expect(
        service.adminForcePasswordChange(selfUser, 'target-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow platform admin to target any user', async () => {
      const admin = {
        id: 'admin-id',
        app_metadata: { system_role: 'admin' },
      } as unknown as User;

      const result = await service.adminForcePasswordChange(admin, 'target-id');

      expect(result.data.message).toBeDefined();
    });

    it('should allow owner to target staff in same tenant', async () => {
      const owner = {
        id: 'owner-id',
        app_metadata: {
          system_role: 'user',
          tenant_role: 'owner',
          tenant_id: 'tenant-1',
        },
      } as unknown as User;
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'staff' },
        error: null,
      });

      const result = await service.adminForcePasswordChange(owner, 'target-id');

      expect(result.data.message).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'tenant_memberships',
      );
    });

    it('should deny owner targeting user in different tenant', async () => {
      const owner = {
        id: 'owner-id',
        app_metadata: {
          system_role: 'user',
          tenant_role: 'owner',
          tenant_id: 'tenant-1',
        },
      } as unknown as User;
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      });

      await expect(
        service.adminForcePasswordChange(owner, 'target-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny owner targeting another owner in same tenant', async () => {
      const owner = {
        id: 'owner-id',
        app_metadata: {
          system_role: 'user',
          tenant_role: 'owner',
          tenant_id: 'tenant-1',
        },
      } as unknown as User;
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'owner' },
        error: null,
      });

      await expect(
        service.adminForcePasswordChange(owner, 'target-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny staff users', async () => {
      const staff = {
        id: 'staff-id',
        app_metadata: {
          system_role: 'user',
          tenant_role: 'staff',
          tenant_id: 'tenant-1',
        },
      } as unknown as User;

      await expect(
        service.adminForcePasswordChange(staff, 'target-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
