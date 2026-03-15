import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TenantGuard(reflector);
  });

  const createMockContext = (user?: Record<string, unknown>) => {
    const request: Record<string, unknown> = {};
    if (user) {
      request.user = user;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should bypass guard for @Public() routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow admin user through with null tenantId', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = createMockContext({
      app_metadata: { user_role: 'admin', tenant_id: null },
    });

    expect(guard.canActivate(context)).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect((request as Record<string, unknown>).tenantId).toBeNull();
  });

  it('should allow tenant_owner with valid tenant_id through', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = createMockContext({
      app_metadata: { user_role: 'tenant_owner', tenant_id: 'tenant-uuid' },
    });

    expect(guard.canActivate(context)).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect((request as Record<string, unknown>).tenantId).toBe('tenant-uuid');
  });

  it('should allow tenant_staff with valid tenant_id through', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = createMockContext({
      app_metadata: { user_role: 'tenant_staff', tenant_id: 'tenant-uuid' },
    });

    expect(guard.canActivate(context)).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect((request as Record<string, unknown>).tenantId).toBe('tenant-uuid');
  });

  it('should throw ForbiddenException for non-admin user without tenant_id', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = createMockContext({
      app_metadata: { user_role: 'tenant_owner' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException for non-admin user with null tenant_id', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = createMockContext({
      app_metadata: { user_role: 'tenant_staff', tenant_id: null },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
