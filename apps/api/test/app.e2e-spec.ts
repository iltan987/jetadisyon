import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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
              PORT: 3000,
            }),
          ],
          isGlobal: true,
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
