// @ts-expect-error -- JS-only package, no type declarations
import { libraryConfig } from '@repo/eslint-config/library';

export default [
  {
    ignores: ['apps/**', 'packages/**', 'node_modules/**'],
  },
  ...libraryConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
