import { globalIgnores } from 'eslint/config';
import nestConfig from '@repo/eslint-config/nest';

export default [
  globalIgnores([
    'dist/',
    'generated/',
    'scripts/',
    'eslint.config.mjs',
    'prettier.config.mjs',
    'webpack.config.js',
  ]),
  ...nestConfig,
];
