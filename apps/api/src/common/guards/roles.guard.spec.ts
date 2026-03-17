import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  function createMockContext(
    appMetadata?: Record<string, unknown>,
  ): ExecutionContext {
    const request = {
      user: appMetadata ? { app_metadata: appMetadata } : undefined,
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ system_role: 'admin' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has matching system_role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext({
      system_role: 'admin',
      tenant_role: null,
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has matching tenant_role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner']);
    const context = createMockContext({
      system_role: 'user',
      tenant_role: 'owner',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when neither role matches', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext({
      system_role: 'user',
      tenant_role: 'staff',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow employee access when employee role is permitted', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['owner', 'staff', 'employee']);
    const context = createMockContext({
      system_role: 'user',
      tenant_role: 'employee',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when employee accesses admin-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext({
      system_role: 'user',
      tenant_role: 'employee',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext();
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow admin to change password (system_role matches)', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['admin', 'owner', 'staff', 'employee']);
    const context = createMockContext({
      system_role: 'admin',
      tenant_role: null,
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
