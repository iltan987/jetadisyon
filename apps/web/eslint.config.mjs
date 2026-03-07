// @ts-expect-error -- JS-only package, no type declarations
import { nextJsConfig } from '@repo/eslint-config/next-js';

/** @type {import("eslint").Linter.Config} */
export default [
  {
    ignores: ['.next/**'],
  },
  ...nextJsConfig,
];
