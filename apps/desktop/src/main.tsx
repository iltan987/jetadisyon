import '@repo/ui/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@repo/ui/components/theme-provider';

import { App } from './app.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
