import {
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { type PinoLogger } from 'nestjs-pino';

import { GlobalExceptionFilter } from './global-exception.filter';

function createMockArgumentsHost(mockResponse: Record<string, jest.Mock>) {
  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => ({}),
    }),
  } as never;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockLogger: Partial<PinoLogger>;

  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockHost = createMockArgumentsHost({ status: mockStatus });

  beforeEach(() => {
    mockLogger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    filter = new GlobalExceptionFilter(mockLogger as PinoLogger);
    jest.clearAllMocks();
  });

  it('should format HttpException into standard error envelope', () => {
    const exception = new UnauthorizedException({
      code: 'AUTH.TOKEN_INVALID',
      message: 'Invalid token',
    });

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockJson).toHaveBeenCalledWith({
      error: { code: 'AUTH.TOKEN_INVALID', message: 'Invalid token' },
    });
  });

  it('should format BadRequestException with details', () => {
    const exception = new BadRequestException({
      code: 'VALIDATION.FAILED',
      message: 'Validation failed',
      details: [{ path: 'email', message: 'Invalid email' }],
    });

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION.FAILED',
        message: 'Validation failed',
        details: [{ path: 'email', message: 'Invalid email' }],
      },
    });
  });

  it('should format unknown errors as 500 SYSTEM.INTERNAL_ERROR', () => {
    filter.catch(new Error('Something broke'), mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      error: {
        code: 'SYSTEM.INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  it('should log 5xx errors via logger.error', () => {
    filter.catch(new Error('Something broke'), mockHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, code: 'SYSTEM.INTERNAL_ERROR' }),
      'An unexpected error occurred',
    );
  });

  it('should log 4xx errors via logger.warn', () => {
    const exception = new UnauthorizedException({
      code: 'AUTH.TOKEN_INVALID',
      message: 'Invalid token',
    });

    filter.catch(exception, mockHost);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, code: 'AUTH.TOKEN_INVALID' }),
      'Invalid token',
    );
  });
});
