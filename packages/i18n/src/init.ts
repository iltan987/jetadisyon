import i18next from 'i18next';

import type { LocaleResources } from './types.js';

interface I18nInitOptions {
  lng: string;
  fallbackLng?: string;
  resources: Record<string, LocaleResources>;
}

export function initI18n(options: I18nInitOptions): Promise<typeof i18next.t> {
  return i18next.init({
    lng: options.lng,
    fallbackLng: options.fallbackLng ?? 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: Object.fromEntries(
      Object.entries(options.resources).map(([lang, translation]) => [
        lang,
        { translation },
      ]),
    ),
  });
}
