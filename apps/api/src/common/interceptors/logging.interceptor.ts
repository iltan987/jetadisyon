import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url } = request;
    const actor = request.user?.email ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const response = context.switchToHttp().getResponse();
          this.logger.log(
            { method, url, status: response.statusCode, duration, actor },
            `${method} ${url}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(
            { method, url, duration, actor, err: error },
            `${method} ${url} FAILED`,
          );
        },
      }),
    );
  }
}
