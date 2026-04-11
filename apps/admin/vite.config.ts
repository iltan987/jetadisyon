import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

import { validateEnv } from './src/env';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  validateEnv(loadEnv(mode, __dirname, ''));

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
