import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
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
});
