import 'reflect-metadata';

import { type ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { TenantId } from './tenant-id.decorator';

function getParamDecoratorFactory() {
  class TestController {
    testMethod(@TenantId() _param: unknown) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'testMethod',
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;

  const key = Object.keys(metadata)[0]!;
  return metadata[key]!.factory;
}

const createMockContext = (
  tenantId?: string | null,
): ExecutionContext => {
  const request: Record<string, unknown> = {};
  if (tenantId !== undefined) {
    request.tenantId = tenantId;
  }
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
};

describe('TenantId decorator', () => {
  const factory = getParamDecoratorFactory();

  it('should return tenantId set by TenantGuard', () => {
    const ctx = createMockContext('tenant-uuid');

    expect(factory(undefined, ctx)).toBe('tenant-uuid');
  });

  it('should return null when tenantId is null (admin user)', () => {
    const ctx = createMockContext(null);

    expect(factory(undefined, ctx)).toBeNull();
  });

  it('should return null when tenantId is not set (public route)', () => {
    const ctx = createMockContext();

    expect(factory(undefined, ctx)).toBeNull();
  });
});
