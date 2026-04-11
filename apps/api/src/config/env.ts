import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    /* eslint-disable sonarjs/no-clear-text-protocols */
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:5173,http://localhost:1420'),
    /* eslint-enable sonarjs/no-clear-text-protocols */
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
