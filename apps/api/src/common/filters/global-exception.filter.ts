import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'SYSTEM.INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp.code as string) ?? this.statusToCode(status);
        message = (resp.message as string) ?? exception.message;
        details = resp.details;
      } else {
        message = exception.message;
        code = this.statusToCode(status);
      }
    }

    if (status >= 500) {
      this.logger.error({ err: exception, status, code }, message);
    } else {
      this.logger.warn({ status, code }, message);
    }

    response.status(status).json({
      error: { code, message, ...(details !== undefined && { details }) },
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION.BAD_REQUEST',
      401: 'AUTH.UNAUTHORIZED',
      403: 'AUTH.FORBIDDEN',
      404: 'RESOURCE.NOT_FOUND',
      409: 'RESOURCE.CONFLICT',
      429: 'SYSTEM.RATE_LIMITED',
    };
    return map[status] ?? 'SYSTEM.INTERNAL_ERROR';
  }
}
