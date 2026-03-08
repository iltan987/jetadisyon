import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockSupabaseClient = {
    auth: {
      signInWithPassword: jest.fn(),
      admin: {
        signOut: jest.fn(),
        getUserById: jest.fn(),
      },
      refreshSession: jest.fn(),
    },
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
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
  });

  describe('login', () => {
    const loginDto = { email: 'admin@test.com', password: 'password123' };

    it('should return tokens and user on successful login', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
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
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
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
    it('should return new tokens on successful refresh', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
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
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' },
      });

      await expect(service.refreshSession('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getMe', () => {
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
