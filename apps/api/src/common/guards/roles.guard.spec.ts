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

  function createMockContext(userRole?: string): ExecutionContext {
    const request = {
      user: userRole ? { app_metadata: { user_role: userRole } } : undefined,
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext('admin');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has matching role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext('admin');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user has non-matching role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext('tenant_staff');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user has no role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext();
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
