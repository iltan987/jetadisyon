import { type ExecutionContext, ForbiddenException } from '@nestjs/common';

import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
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

  it('should allow admin user through with null tenantId', () => {
    const context = createMockContext({
      app_metadata: {
        system_role: 'admin',
        tenant_role: null,
        tenant_id: null,
      },
    });

    expect(guard.canActivate(context)).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect((request as Record<string, unknown>).tenantId).toBeNull();
  });

  it('should allow owner with valid tenant_id through', () => {
    const context = createMockContext({
      app_metadata: {
        system_role: 'user',
        tenant_role: 'owner',
        tenant_id: 'tenant-uuid',
      },
    });

    expect(guard.canActivate(context)).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect((request as Record<string, unknown>).tenantId).toBe('tenant-uuid');
  });

  it('should allow staff with valid tenant_id through', () => {
    const context = createMockContext({
      app_metadata: {
        system_role: 'user',
        tenant_role: 'staff',
        tenant_id: 'tenant-uuid',
      },
    });

    expect(guard.canActivate(context)).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect((request as Record<string, unknown>).tenantId).toBe('tenant-uuid');
  });

  it('should allow employee with valid tenant_id through', () => {
    const context = createMockContext({
      app_metadata: {
        system_role: 'user',
        tenant_role: 'employee',
        tenant_id: 'tenant-uuid',
      },
    });

    expect(guard.canActivate(context)).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect((request as Record<string, unknown>).tenantId).toBe('tenant-uuid');
  });

  it('should throw ForbiddenException for non-admin user without tenant_id', () => {
    const context = createMockContext({
      app_metadata: { system_role: 'user', tenant_role: 'owner' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException for non-admin user with null tenant_id', () => {
    const context = createMockContext({
      app_metadata: {
        system_role: 'user',
        tenant_role: 'staff',
        tenant_id: null,
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
