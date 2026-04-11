import './types.js';

import type { useTranslation as UseTranslationFn } from 'react-i18next';

export { initI18n } from './init.js';
export type { LocaleResources } from './types.js';
export { useTranslation } from 'react-i18next';

export type TranslationKey = Parameters<ReturnType<typeof UseTranslationFn>['t']>[0];
