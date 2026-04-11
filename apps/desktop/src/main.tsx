import '@repo/ui/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initI18n } from '@repo/i18n';
import { ThemeProvider } from '@repo/ui/components/theme-provider';

import { App } from './app.tsx';

initI18n().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
});
