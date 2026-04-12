import '@repo/ui/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initI18n } from '@repo/i18n';
import { ErrorBoundary, ThemeProvider } from '@repo/ui/components';

import { App } from './app.tsx';
import enLocale from './locales/en.ts';
import trLocale from './locales/tr.ts';

initI18n({
  lng: 'tr',
  fallbackLng: 'en',
  resources: { tr: trLocale, en: enLocale },
}).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
