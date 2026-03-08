import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let reflector: Reflector;

  const mockSupabaseClient = {
    auth: { getUser: jest.fn() },
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new SupabaseAuthGuard(
      mockSupabaseService as unknown as SupabaseService,
      reflector,
    );
    jest.clearAllMocks();
  });

  function createMockContext(
    authHeader?: string,
    isPublic = false,
  ): ExecutionContext {
    const request = { headers: { authorization: authHeader }, user: null };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    return context;
  }

  it('should allow public routes without authentication', async () => {
    const context = createMockContext(undefined, true);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when token is missing', async () => {
    const context = createMockContext(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException for invalid token', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const context = createMockContext('Bearer invalid-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should set request.user and return true for valid token', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@test.com',
      app_metadata: { user_role: 'admin' },
    };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const context = createMockContext('Bearer valid-token');
    const request = context.switchToHttp().getRequest();

    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual(mockUser);
  });
});
