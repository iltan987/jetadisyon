import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    email: z.email(),
    password: z.string().min(8),
  });

  const pipe = new ZodValidationPipe(schema);
  const metadata = { type: 'body' as const, metatype: Object, data: '' };

  it('should pass through valid input and return parsed data', () => {
    const input = { email: 'test@test.com', password: 'password123' };
    const result = pipe.transform(input, metadata);
    expect(result).toEqual(input);
  });

  it('should throw BadRequestException for invalid input', () => {
    const input = { email: 'not-email', password: 'short' };
    expect(() => pipe.transform(input, metadata)).toThrow(BadRequestException);
  });

  it('should include field-level error details', () => {
    const input = { email: 'not-email', password: 'short' };
    try {
      pipe.transform(input, metadata);
      fail('Expected to throw');
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as any;
      expect(response.code).toBe('VALIDATION.FAILED');
      expect(response.details).toBeInstanceOf(Array);
      expect(response.details.length).toBeGreaterThan(0);
      expect(response.details[0]).toHaveProperty('path');
      expect(response.details[0]).toHaveProperty('message');
    }
  });
});
