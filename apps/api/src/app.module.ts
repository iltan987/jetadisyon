import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validate } from './config/env.validation';
import { SupabaseModule } from './supabase/supabase.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
        autoLogging: false,
        genReqId: (req, res) => {
          const existingId = req.headers['x-request-id'];
          if (existingId)
            return Array.isArray(existingId)
              ? (existingId[0] ?? crypto.randomUUID())
              : existingId;
          const id = crypto.randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: seconds(60), limit: 100 },
    ]),
    SupabaseModule,
    AuthModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
