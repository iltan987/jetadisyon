import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type SupabaseService } from '../../supabase/supabase.service';
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
    const context = createMockContext();
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

  it('should set request.user with JWT app_metadata for valid token', async () => {
    const jwtAppMetadata = { user_role: 'admin', tenant_id: null };
    const dbUser = {
      id: 'user-id',
      email: 'test@test.com',
      app_metadata: { provider: 'email', providers: ['email'] },
    };

    // Build a fake JWT with the hook-injected app_metadata
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString(
      'base64url',
    );
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-id', app_metadata: jwtAppMetadata }),
    ).toString('base64url');
    const fakeJwt = `${header}.${payload}.signature`;

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: dbUser },
      error: null,
    });

    const context = createMockContext(`Bearer ${fakeJwt}`);
    const request = context.switchToHttp().getRequest();

    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user.app_metadata).toEqual(jwtAppMetadata);
    expect(request.user.id).toBe('user-id');
  });

  it('should throw UnauthorizedException for malformed JWT payload', async () => {
    const malformedJwt = 'header.!!!invalid-base64.signature';

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id', app_metadata: {} } },
      error: null,
    });

    const context = createMockContext(`Bearer ${malformedJwt}`);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
