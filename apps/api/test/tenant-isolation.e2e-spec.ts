import { type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { RolesGuard } from './../src/common/guards/roles.guard';
import { TenantGuard } from './../src/common/guards/tenant.guard';
import { LoggingInterceptor } from './../src/common/interceptors/logging.interceptor';
import { SupabaseService } from './../src/supabase/supabase.service';
import { TenantsController } from './../src/tenants/tenants.controller';
import { TenantsService } from './../src/tenants/tenants.service';

/**
 * Integration tests for the guard chain: MockAuth → Roles → Tenant
 *
 * These tests verify that the guard chain correctly enforces role-based access
 * and tenant context injection. A custom mock auth guard simulates different
 * user types by injecting user data onto the request.
 */

// Mock auth guard that reads the user from a per-test variable
let currentTestUser: Record<string, unknown> | null = null;

class MockAuthGuard {
  canActivate(context: {
    switchToHttp: () => {
      getRequest: () => Record<string, unknown>;
    };
    getHandler: () => unknown;
    getClass: () => unknown;
  }) {
    if (!currentTestUser) return false;
    const req = context.switchToHttp().getRequest();
    req.user = currentTestUser;
    req.accessToken = 'mock-token';
    return true;
  }
}

const mockSupabaseService = {
  getClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'tenant-1',
              name: 'Test',
              contact_phone: null,
              status: 'active',
              license_status: 'trial',
              created_at: '2026-01-01',
              updated_at: '2026-01-01',
              tenant_memberships: [],
            },
            error: null,
          }),
        }),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
  getClientForUser: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'tenant-1',
              name: 'Test',
              contact_phone: null,
              status: 'active',
              license_status: 'trial',
              created_at: '2026-01-01',
              updated_at: '2026-01-01',
              tenant_memberships: [],
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
  createAuthClient: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  assign: jest.fn(),
};

describe('Tenant Isolation Guard Chain (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, TenantsController],
      providers: [
        AppService,
        {
          provide: TenantsService,
          useFactory: () => {
            const service = Object.create(TenantsService.prototype);
            service.supabaseService = mockSupabaseService;
            service.logger = mockLogger;
            return service;
          },
        },
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: APP_GUARD, useClass: MockAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: TenantGuard },
        {
          provide: LoggingInterceptor,
          useValue: {
            intercept: (_: unknown, next: { handle: () => unknown }) =>
              next.handle(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    currentTestUser = null;
  });

  describe('unauthenticated requests (AC #5)', () => {
    it('11.6: should reject unauthenticated request', async () => {
      currentTestUser = null;
      await request(app.getHttpServer()).get('/api/v1/tenants').expect(403);
    });
  });

  describe('admin access (AC #4)', () => {
    it('11.5: admin can access tenant list endpoint', async () => {
      currentTestUser = {
        id: 'admin-uuid',
        app_metadata: { user_role: 'admin', tenant_id: null },
      };
      const res = await request(app.getHttpServer()).get('/api/v1/tenants');
      expect(res.status).toBe(200);
    });

    it('admin can access specific tenant endpoint', async () => {
      currentTestUser = {
        id: 'admin-uuid',
        app_metadata: { user_role: 'admin', tenant_id: null },
      };
      const res = await request(app.getHttpServer()).get(
        '/api/v1/tenants/00000000-0000-0000-0000-000000000001',
      );
      expect(res.status).toBe(200);
    });
  });

  describe('tenant_owner access (AC #2, #3)', () => {
    it('11.1: tenant_owner can access tenant-scoped endpoint', async () => {
      currentTestUser = {
        id: 'owner-uuid',
        app_metadata: { user_role: 'tenant_owner', tenant_id: 'tenant-1' },
      };
      const res = await request(app.getHttpServer()).get(
        '/api/v1/tenants/00000000-0000-0000-0000-000000000001',
      );
      expect(res.status).toBe(200);
    });

    it('tenant_owner cannot access admin-only list endpoint', async () => {
      currentTestUser = {
        id: 'owner-uuid',
        app_metadata: { user_role: 'tenant_owner', tenant_id: 'tenant-1' },
      };
      await request(app.getHttpServer()).get('/api/v1/tenants').expect(403);
    });

    it('11.2: tenant_owner accessing other tenant data gets 404 (RLS blocks)', async () => {
      currentTestUser = {
        id: 'owner-uuid',
        app_metadata: { user_role: 'tenant_owner', tenant_id: 'tenant-1' },
      };

      // Simulate RLS blocking cross-tenant access: user-scoped client returns no rows
      mockSupabaseService.getClientForUser.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  code: 'PGRST116',
                  message:
                    'JSON object requested, multiple (or no) rows returned',
                },
              }),
            }),
          }),
        }),
      });

      await request(app.getHttpServer())
        .get('/api/v1/tenants/00000000-0000-0000-0000-000000000002')
        .expect(404);
    });
  });

  describe('tenant_staff access (AC #3)', () => {
    it('11.3: tenant_staff with valid tenant_id passes guard chain', async () => {
      currentTestUser = {
        id: 'staff-uuid',
        app_metadata: { user_role: 'tenant_staff', tenant_id: 'tenant-1' },
      };
      const res = await request(app.getHttpServer()).get('/api/v1');
      expect(res.status).toBe(200);
    });

    it('11.4: tenant_staff cannot access admin endpoint', async () => {
      currentTestUser = {
        id: 'staff-uuid',
        app_metadata: { user_role: 'tenant_staff', tenant_id: 'tenant-1' },
      };
      await request(app.getHttpServer()).get('/api/v1/tenants').expect(403);
    });
  });

  describe('missing tenant context (AC #5)', () => {
    it('non-admin user without tenant_id is rejected by TenantGuard', async () => {
      currentTestUser = {
        id: 'broken-uuid',
        app_metadata: { user_role: 'tenant_owner' },
      };
      const res = await request(app.getHttpServer()).get(
        '/api/v1/tenants/00000000-0000-0000-0000-000000000001',
      );
      expect(res.status).toBe(403);
    });
  });
});
