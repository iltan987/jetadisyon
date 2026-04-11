import i18next from 'i18next';

import trLocale from './locales/tr.json';

export function initI18n(): Promise<typeof i18next.t> {
  return i18next.init({
    lng: 'tr',
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      tr: {
        translation: trLocale,
      },
    },
  });
}
