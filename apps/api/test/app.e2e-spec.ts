import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SupabaseAuthGuard } from './../src/common/guards/supabase-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(ConfigModule)
      .useModule(
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              SUPABASE_URL: 'http://localhost:8000',
              SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              SUPABASE_JWT_SECRET: 'test-jwt-secret',
              PORT: 3000,
            }),
          ],
          isGlobal: true,
        }),
      )
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });
});
