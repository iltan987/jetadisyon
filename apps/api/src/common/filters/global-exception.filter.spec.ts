import {
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
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

  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockHost = createMockArgumentsHost({ status: mockStatus });

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
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
});
