import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              SUPABASE_URL: 'http://localhost:8000',
              SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
            }),
          ],
        }),
      ],
      providers: [SupabaseService],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a supabase client', () => {
    expect(service.getClient()).toBeDefined();
  });

  it('should return the same singleton client on repeated calls', () => {
    const client1 = service.getClient();
    const client2 = service.getClient();
    expect(client1).toBe(client2);
  });

  it('should create a new auth client each time', () => {
    const authClient1 = service.createAuthClient();
    const authClient2 = service.createAuthClient();
    expect(authClient1).toBeDefined();
    expect(authClient2).toBeDefined();
    expect(authClient1).not.toBe(authClient2);
  });

  it('should return an auth client different from the singleton', () => {
    const singletonClient = service.getClient();
    const authClient = service.createAuthClient();
    expect(authClient).not.toBe(singletonClient);
  });

  describe('getClientForUser', () => {
    it('should return a client different from the service-role singleton', () => {
      const userClient = service.getClientForUser('test-token');
      const serviceClient = service.getClient();
      expect(userClient).toBeDefined();
      expect(userClient).not.toBe(serviceClient);
    });

    it('should return a new client on each call', () => {
      const client1 = service.getClientForUser('token-1');
      const client2 = service.getClientForUser('token-2');
      expect(client1).not.toBe(client2);
    });
  });
});
