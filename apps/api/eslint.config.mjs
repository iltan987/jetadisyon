import { globalIgnores } from 'eslint/config';
import nestConfig from '@repo/eslint-config/nest';

export default [
  globalIgnores([
    'dist/',
    'generated/',
    'eslint.config.mjs',
    'prettier.config.mjs',
  ]),
  ...nestConfig,
];
