import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { type PinoLogger } from 'nestjs-pino';
import { of, throwError } from 'rxjs';

import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: Partial<PinoLogger>;

  beforeEach(() => {
    mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };
    interceptor = new LoggingInterceptor(mockLogger as PinoLogger);
  });

  function createMockContext(userEmail?: string): ExecutionContext {
    const request = {
      method: 'GET',
      url: '/test',
      user: userEmail ? { email: userEmail } : undefined,
    };
    const response = { statusCode: 200 };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }

  it('should log successful requests with actor info', (done) => {
    const context = createMockContext('admin@test.com');
    const next: CallHandler = { handle: () => of('result') };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            status: 200,
            actor: 'admin@test.com',
          }),
          'GET /test',
        );
        done();
      },
    });
  });

  it('should log anonymous for unauthenticated requests', (done) => {
    const context = createMockContext();
    const next: CallHandler = { handle: () => of('result') };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({ actor: 'anonymous' }),
          'GET /test',
        );
        done();
      },
    });
  });

  it('should log errors with actor info', (done) => {
    const context = createMockContext('admin@test.com');
    const error = new Error('Test error');
    const next: CallHandler = { handle: () => throwError(() => error) };

    interceptor.intercept(context, next).subscribe({
      error: () => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            actor: 'admin@test.com',
            err: error,
          }),
          'GET /test FAILED',
        );
        done();
      },
    });
  });

  it('should include duration in log output', (done) => {
    const context = createMockContext();
    const next: CallHandler = { handle: () => of('result') };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            duration: expect.any(Number),
          }),
          expect.any(String),
        );
        done();
      },
    });
  });
});
