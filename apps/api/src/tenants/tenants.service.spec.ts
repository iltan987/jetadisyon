import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { User } from '@supabase/supabase-js';
import { PinoLogger } from 'nestjs-pino';

import { SupabaseService } from '../supabase/supabase.service';
import { TenantsService } from './tenants.service';

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    admin: {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    },
  },
};

const mockSupabaseService = {
  getClient: jest.fn(() => mockSupabaseClient),
};

const mockLogger = {
  setContext: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    jest.clearAllMocks();
    mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient);
  });

  describe('createTenant', () => {
    const dto = {
      businessName: 'Test Restaurant',
      ownerFullName: 'John Doe',
      ownerEmail: 'john@example.com',
      contactPhone: '+905551234567',
    };
    const adminUserId = 'admin-uuid';

    it('should create tenant with owner account successfully', async () => {
      const tenantRow = {
        id: 'tenant-uuid',
        name: 'Test Restaurant',
        contact_phone: '+905551234567',
        status: 'active',
        license_status: 'trial',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      // Mock chain: from('tenants').insert().select().single()
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: tenantRow, error: null }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'tenant_memberships') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'owner-uuid' } },
        error: null,
      });

      const result = await service.createTenant(dto, adminUserId);

      expect(result.data.tenant.id).toBe('tenant-uuid');
      expect(result.data.tenant.name).toBe('Test Restaurant');
      expect(result.data.credentials.email).toBe('john@example.com');
      expect(result.data.credentials.temporaryPassword).toBeDefined();
      expect(result.data.credentials.temporaryPassword.length).toBeGreaterThan(
        0,
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'tenant-uuid',
                    name: 'Test',
                    contact_phone: null,
                    status: 'active',
                    license_status: 'trial',
                    created_at: '',
                    updated_at: '',
                  },
                  error: null,
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      });

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: {
          message: 'A user with this email address has already been registered',
          code: 'email_exists',
        },
      });
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        error: null,
      });

      await expect(service.createTenant(dto, adminUserId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException on tenant insert failure', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB error' },
            }),
          }),
        }),
      });

      await expect(service.createTenant(dto, adminUserId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should cleanup on profile insert failure', async () => {
      const tenantRow = {
        id: 'tenant-uuid',
        name: 'Test',
        contact_phone: null,
        status: 'active',
        license_status: 'trial',
        created_at: '',
        updated_at: '',
      };

      const deleteEq = jest.fn().mockResolvedValue({ error: null });
      const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: tenantRow, error: null }),
              }),
            }),
            delete: deleteFn,
          };
        }
        if (table === 'profiles') {
          return {
            insert: jest
              .fn()
              .mockResolvedValue({ error: { message: 'Profile error' } }),
          };
        }
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      });

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'owner-uuid' } },
        error: null,
      });
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        error: null,
      });

      await expect(service.createTenant(dto, adminUserId)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Verify cleanup was called
      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        'owner-uuid',
      );
    });

    it('should still delete tenant when deleteUser fails during cleanup', async () => {
      const tenantRow = {
        id: 'tenant-uuid',
        name: 'Test',
        contact_phone: null,
        status: 'active',
        license_status: 'trial',
        created_at: '',
        updated_at: '',
      };

      const deleteEq = jest.fn().mockResolvedValue({ error: null });
      const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: tenantRow, error: null }),
              }),
            }),
            delete: deleteFn,
          };
        }
        if (table === 'profiles') {
          return {
            insert: jest
              .fn()
              .mockResolvedValue({ error: { message: 'Profile error' } }),
          };
        }
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      });

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'owner-uuid' } },
        error: null,
      });
      mockSupabaseClient.auth.admin.deleteUser.mockRejectedValue(
        new Error('Auth service unavailable'),
      );

      await expect(service.createTenant(dto, adminUserId)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Verify both cleanup steps were attempted
      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        'owner-uuid',
      );
      expect(deleteFn).toHaveBeenCalled();
      expect(deleteEq).toHaveBeenCalledWith('id', 'tenant-uuid');
    });
  });

  describe('findAll', () => {
    it('should return all tenants with owner info', async () => {
      const mockData = [
        {
          id: 'tenant-1',
          name: 'Restaurant A',
          contact_phone: '+905551234567',
          status: 'active',
          license_status: 'trial',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          tenant_memberships: [
            {
              profiles: {
                id: 'owner-1',
                full_name: 'Owner A',
                role: 'tenant_owner',
              },
            },
          ],
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Restaurant A');
      expect(result.data[0]!.ownerName).toBe('Owner A');
    });

    it('should return tenants without owner (orphaned tenants)', async () => {
      const mockData = [
        {
          id: 'orphan-1',
          name: 'Orphaned Restaurant',
          contact_phone: null,
          status: 'active',
          license_status: 'trial',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          tenant_memberships: [],
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Orphaned Restaurant');
      expect(result.data[0]!.ownerName).toBeNull();
      expect(result.data[0]!.ownerId).toBeNull();
    });

    it('should throw on database error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'DB error' },
          }),
        }),
      });

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findById', () => {
    const mockAdminUser = {
      id: 'admin-uuid',
      app_metadata: { user_role: 'admin', tenant_id: null },
    } as unknown as User;

    const mockOwnerUser = {
      id: 'owner-1',
      app_metadata: { user_role: 'tenant_owner', tenant_id: 'tenant-1' },
    } as unknown as User;

    const mockTenantData = {
      id: 'tenant-1',
      name: 'Restaurant A',
      contact_phone: null,
      status: 'active',
      license_status: 'trial',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      tenant_memberships: [
        {
          profiles: {
            id: 'owner-1',
            full_name: 'Owner A',
            role: 'tenant_owner',
          },
        },
      ],
    };

    it('should return tenant by id for admin', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockTenantData, error: null }),
          }),
        }),
      });

      const result = await service.findById('tenant-1', mockAdminUser);

      expect(result.data.id).toBe('tenant-1');
      expect(result.data.ownerName).toBe('Owner A');
    });

    it('should return tenant for tenant_owner with membership', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenant_memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'membership-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: mockTenantData, error: null }),
            }),
          }),
        };
      });

      const result = await service.findById('tenant-1', mockOwnerUser);

      expect(result.data.id).toBe('tenant-1');
    });

    it('should throw ForbiddenException for tenant_owner without membership', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenant_memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: mockTenantData, error: null }),
            }),
          }),
        };
      });

      await expect(service.findById('tenant-1', mockOwnerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      await expect(
        service.findById('nonexistent', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
