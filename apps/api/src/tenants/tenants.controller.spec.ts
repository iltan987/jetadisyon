import { Test, TestingModule } from '@nestjs/testing';
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
      };
      const user = {
        id: 'admin-uuid',
      } as unknown as import('@supabase/supabase-js').User;
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
    it('should return tenant by id', async () => {
      const expected = { data: { id: 'tenant-1', name: 'Restaurant A' } };
      mockTenantsService.findById.mockResolvedValue(expected);

      const result = await controller.findById('tenant-1');

      expect(mockTenantsService.findById).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(expected);
    });
  });
});
