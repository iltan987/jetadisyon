import type trLocale from './locales/tr.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof trLocale;
    };
  }
}
