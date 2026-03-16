import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { User } from '@supabase/supabase-js';
import { PinoLogger } from 'nestjs-pino';

import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TenantsService } from './tenants.service';

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    admin: {
      generateLink: jest.fn(),
      deleteUser: jest.fn(),
      getUserById: jest.fn(),
    },
  },
};

const mockUserScopedClient = {
  from: jest.fn(),
};

const mockSupabaseService = {
  getClient: jest.fn(() => mockSupabaseClient),
  getClientForUser: jest.fn(() => mockUserScopedClient),
};

const mockMailService = {
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
};

const mockLogger = {
  setContext: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: MailService, useValue: mockMailService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: unknown) => {
              if (key === 'APP_URL') return 'http://localhost:3001';
              return defaultVal;
            }),
          },
        },
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

    it('should create tenant with invitation email successfully', async () => {
      const tenantRow = {
        id: 'tenant-uuid',
        name: 'Test Restaurant',
        contact_phone: '+905551234567',
        status: 'active',
        license_status: 'trial',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

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

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { id: 'owner-uuid' },
          properties: { hashed_token: 'abc123' },
        },
        error: null,
      });

      const result = await service.createTenant(dto, adminUserId);

      expect(result.data.tenant.id).toBe('tenant-uuid');
      expect(result.data.tenant.name).toBe('Test Restaurant');
      expect(result.data.invitation.email).toBe('john@example.com');
      expect(result.data.invitation.sent).toBe(true);
      expect(mockMailService.sendInvitationEmail).toHaveBeenCalledWith(
        'john@example.com',
        'http://localhost:3001/auth/accept-invite?token_hash=abc123&type=invite',
        'Test Restaurant',
      );
    });

    it('should return sent: false when email sending fails (tenant still created)', async () => {
      const tenantRow = {
        id: 'tenant-uuid',
        name: 'Test Restaurant',
        contact_phone: '+905551234567',
        status: 'active',
        license_status: 'trial',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

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

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { id: 'owner-uuid' },
          properties: { hashed_token: 'abc123' },
        },
        error: null,
      });

      mockMailService.sendInvitationEmail.mockRejectedValueOnce(
        new Error('SMTP connection refused'),
      );

      const result = await service.createTenant(dto, adminUserId);

      expect(result.data.tenant.id).toBe('tenant-uuid');
      expect(result.data.invitation.email).toBe('john@example.com');
      expect(result.data.invitation.sent).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'john@example.com' }),
        expect.stringContaining('Failed to send invitation email'),
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

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: { user: null, properties: null },
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

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { id: 'owner-uuid' },
          properties: { hashed_token: 'abc123' },
        },
        error: null,
      });
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        error: null,
      });

      await expect(service.createTenant(dto, adminUserId)).rejects.toThrow(
        InternalServerErrorException,
      );

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

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { id: 'owner-uuid' },
          properties: { hashed_token: 'abc123' },
        },
        error: null,
      });
      mockSupabaseClient.auth.admin.deleteUser.mockRejectedValue(
        new Error('Auth service unavailable'),
      );

      await expect(service.createTenant(dto, adminUserId)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        'owner-uuid',
      );
      expect(deleteFn).toHaveBeenCalled();
      expect(deleteEq).toHaveBeenCalledWith('id', 'tenant-uuid');
    });
  });

  describe('resendInvitation', () => {
    const mockSelectEqSingle = (data: unknown) => {
      const result = Promise.resolve({
        data,
        error: data ? null : { message: 'Not found' },
      });
      const builder = Object.assign(result, {
        overrideTypes: jest.fn().mockReturnValue(result),
      });
      const eqFn = jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(builder),
      });
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            // Support chained .eq() for the profiles.role filter
            eq: eqFn,
            single: jest.fn().mockReturnValue(builder),
          }),
        }),
      };
    };

    it('should resend invitation for pending owner', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return mockSelectEqSingle({ name: 'Test Restaurant' });
        }
        if (table === 'tenant_memberships') {
          return mockSelectEqSingle({ user_id: 'owner-uuid' });
        }
        return {};
      });

      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'owner-uuid',
            email: 'owner@test.com',
            user_metadata: { invitation_pending: true },
          },
        },
        error: null,
      });

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          user: { id: 'owner-uuid' },
          properties: { hashed_token: 'fresh-token' },
        },
        error: null,
      });

      const result = await service.resendInvitation('tenant-uuid');

      expect(result.data.email).toBe('owner@test.com');
      expect(result.data.sent).toBe(true);
      expect(mockMailService.sendInvitationEmail).toHaveBeenCalledWith(
        'owner@test.com',
        'http://localhost:3001/auth/accept-invite?token_hash=fresh-token&type=invite',
        'Test Restaurant',
      );
    });

    it('should throw BadRequestException when invitation is not pending', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return mockSelectEqSingle({ name: 'Test Restaurant' });
        }
        if (table === 'tenant_memberships') {
          return mockSelectEqSingle({ user_id: 'owner-uuid' });
        }
        return {};
      });

      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'owner-uuid',
            email: 'owner@test.com',
            user_metadata: {},
          },
        },
        error: null,
      });

      await expect(service.resendInvitation('tenant-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockSupabaseClient.from.mockImplementation(() =>
        mockSelectEqSingle(null),
      );

      await expect(service.resendInvitation('bad-uuid')).rejects.toThrow(
        NotFoundException,
      );
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

    const accessToken = 'mock-access-token';

    it('should return tenant by id for admin using service-role client', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockTenantData, error: null }),
          }),
        }),
      });

      const result = await service.findById(
        'tenant-1',
        mockAdminUser,
        accessToken,
      );

      expect(result.data.id).toBe('tenant-1');
      expect(result.data.ownerName).toBe('Owner A');
      expect(mockSupabaseService.getClient).toHaveBeenCalled();
      expect(mockSupabaseService.getClientForUser).not.toHaveBeenCalled();
    });

    it('should return tenant for tenant_owner using user-scoped client (RLS)', async () => {
      mockUserScopedClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockTenantData, error: null }),
          }),
        }),
      });

      const result = await service.findById(
        'tenant-1',
        mockOwnerUser,
        accessToken,
      );

      expect(result.data.id).toBe('tenant-1');
      expect(mockSupabaseService.getClientForUser).toHaveBeenCalledWith(
        accessToken,
      );
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when RLS returns no data for non-admin', async () => {
      mockUserScopedClient.from.mockReturnValue({
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
        service.findById('tenant-1', mockOwnerUser, accessToken),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenant not found for admin', async () => {
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
        service.findById('nonexistent', mockAdminUser, accessToken),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
