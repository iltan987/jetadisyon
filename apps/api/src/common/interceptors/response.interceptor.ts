import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ResponseCode } from '@repo/types';

interface WrappedResponse {
  code: string;
  data: unknown;
  message: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<WrappedResponse> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data !== null &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data
        ) {
          return data as WrappedResponse;
        }
        return {
          code: ResponseCode.SUCCESS,
          data,
          message: 'OK',
        };
      }),
    );
  }
}
