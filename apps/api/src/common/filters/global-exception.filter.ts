import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import type { ApiResponse } from '@repo/types';
import { ResponseCode } from '@repo/types';

function toResponseCode(status: number): ResponseCode {
  switch (status as HttpStatus) {
    case HttpStatus.BAD_REQUEST:
      return ResponseCode.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ResponseCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ResponseCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ResponseCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ResponseCode.CONFLICT;
    case HttpStatus.NOT_IMPLEMENTED:
      return ResponseCode.FEATURE_NOT_IMPLEMENTED;
    default:
      return ResponseCode.INTERNAL_ERROR;
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else {
      this.logger.error(exception);
    }

    const body: ApiResponse = { code: toResponseCode(status), message };
    response.status(status).json(body);
  }
}
