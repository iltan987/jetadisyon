import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockSupabaseClient = {
    auth: {
      admin: {
        signOut: jest.fn(),
        getUserById: jest.fn(),
      },
    },
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient);
    mockSupabaseService.createAuthClient.mockReturnValue(mockAuthClient);
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
            app_metadata: { user_role: 'admin', tenant_id: null },
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
            app_metadata: { user_role: 'admin', tenant_id: null },
          },
        },
        error: null,
      });

      const result = await service.login(loginDto);

      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe('refresh-token');
      expect(result.data.user.email).toBe('admin@test.com');
      expect(result.data.user.role).toBe('admin');
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockAuthClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials' },
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
            app_metadata: { user_role: 'admin', tenant_id: null },
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
            app_metadata: { user_role: 'admin', tenant_id: null },
          },
        },
        error: null,
      });

      const result = await service.getMe('user-id');

      expect(result.data.id).toBe('user-id');
      expect(result.data.email).toBe('admin@test.com');
      expect(result.data.role).toBe('admin');
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
});
