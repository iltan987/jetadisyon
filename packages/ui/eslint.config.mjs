// @ts-expect-error -- JS-only package, no type declarations
import { config } from '@repo/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config} */
export default config;
