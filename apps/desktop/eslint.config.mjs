import { globalIgnores } from 'eslint/config';

import reactConfig from '@repo/eslint-config/react';

export default [globalIgnores(['dist/', 'src-tauri/']), ...reactConfig];
