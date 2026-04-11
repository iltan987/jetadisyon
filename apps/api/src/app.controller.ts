import { Controller, Get } from '@nestjs/common';

import type { ApiResponse } from '@repo/types';
import { ResponseCode } from '@repo/types';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health(): ApiResponse {
    return { code: ResponseCode.SUCCESS, message: 'OK' };
  }
}
