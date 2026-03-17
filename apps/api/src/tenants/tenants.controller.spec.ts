import { Test, type TestingModule } from '@nestjs/testing';
import { type User } from '@supabase/supabase-js';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

const mockTenantsService = {
  createTenant: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  resendInvitation: jest.fn(),
};

describe('TenantsController', () => {
  let controller: TenantsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [{ provide: TenantsService, useValue: mockTenantsService }],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call createTenant with dto and user id', async () => {
      const dto = {
        businessName: 'Test Restaurant',
        ownerFullName: 'John Doe',
        ownerEmail: 'john@example.com',
        contactPhone: undefined,
      };
      const user = {
        id: 'admin-uuid',
      } as unknown as User;
      const expected = {
        data: {
          tenant: { id: 'tenant-uuid', name: 'Test Restaurant' },
          invitation: { email: 'john@example.com', sent: true },
        },
      };

      mockTenantsService.createTenant.mockResolvedValue(expected);

      const result = await controller.create(dto, user);

      expect(mockTenantsService.createTenant).toHaveBeenCalledWith(
        dto,
        'admin-uuid',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return all tenants', async () => {
      const expected = { data: [{ id: 'tenant-1', name: 'Restaurant A' }] };
      mockTenantsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(result).toEqual(expected);
    });
  });

  describe('findById', () => {
    it('should call findById with tenantId, user, and accessToken', async () => {
      const user = {
        id: 'admin-uuid',
        app_metadata: { system_role: 'admin' },
      } as unknown as User;
      const accessToken = 'mock-token';
      const expected = { data: { id: 'tenant-1', name: 'Restaurant A' } };
      mockTenantsService.findById.mockResolvedValue(expected);

      const result = await controller.findById('tenant-1', user, accessToken);

      expect(mockTenantsService.findById).toHaveBeenCalledWith(
        'tenant-1',
        user,
        accessToken,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('resendInvitation', () => {
    it('should call resendInvitation with tenantId', async () => {
      const expected = {
        data: { email: 'owner@test.com', sent: true },
      };
      mockTenantsService.resendInvitation.mockResolvedValue(expected);

      const result = await controller.resendInvitation('tenant-uuid');

      expect(mockTenantsService.resendInvitation).toHaveBeenCalledWith(
        'tenant-uuid',
      );
      expect(result).toEqual(expected);
    });
  });
});
