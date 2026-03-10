import { Test, type TestingModule } from '@nestjs/testing';
import { type User } from '@supabase/supabase-js';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

const mockTenantsService = {
  createTenant: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
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
          credentials: { email: 'john@example.com', temporaryPassword: 'abc' },
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
    it('should call findById with tenantId and user', async () => {
      const user = {
        id: 'admin-uuid',
        app_metadata: { user_role: 'admin' },
      } as unknown as User;
      const expected = { data: { id: 'tenant-1', name: 'Restaurant A' } };
      mockTenantsService.findById.mockResolvedValue(expected);

      const result = await controller.findById('tenant-1', user);

      expect(mockTenantsService.findById).toHaveBeenCalledWith(
        'tenant-1',
        user,
      );
      expect(result).toEqual(expected);
    });
  });
});
