import { defineConfig, mergeConfig } from 'vitest/config';

import sharedConfig from '@repo/vite-config/vitest.shared.ts';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      coverage: {
        include: ['src/**'],
      },
    },
  }),
);
