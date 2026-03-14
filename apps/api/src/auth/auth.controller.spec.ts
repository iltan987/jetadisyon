import { Test, type TestingModule } from '@nestjs/testing';
import { type User } from '@supabase/supabase-js';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  refreshSession: jest.fn(),
  getMe: jest.fn(),
  changePassword: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('changePassword', () => {
    const user = {
      id: 'user-id',
      email: 'owner@test.com',
    } as unknown as User;

    const dto = {
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    };

    it('should call authService.changePassword with correct args', async () => {
      const expected = { data: { message: 'Password changed successfully' } };
      mockAuthService.changePassword.mockResolvedValue(expected);

      const result = await controller.changePassword(user, dto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-id',
        'owner@test.com',
        dto,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      const expected = {
        data: {
          accessToken: 'token',
          refreshToken: 'refresh',
          mustChangePassword: false,
          user: { id: '1', email: 'test@test.com', role: null, tenantId: null },
        },
      };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user id', async () => {
      const user = { id: 'user-id' } as unknown as User;
      const expected = { data: { message: 'Logged out successfully' } };
      mockAuthService.logout.mockResolvedValue(expected);

      const result = await controller.logout(user);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(expected);
    });
  });
});
