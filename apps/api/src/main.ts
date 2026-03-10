import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
  });
  await app.listen(config.get<number>('PORT')!);
}
void bootstrap();
