import { globalIgnores } from 'eslint/config';

import reactConfig from '@repo/eslint-config/react';

export default [
  globalIgnores([
    'src/components/shadcn/',
    'src/hooks/shadcn/',
    'src/lib/shadcn/',
  ]),
  ...reactConfig,
];
