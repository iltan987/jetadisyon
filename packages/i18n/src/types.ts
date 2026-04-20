import type { ResponseCode } from '@repo/types';

type ResponseCodeValue = (typeof ResponseCode)[keyof typeof ResponseCode];

export interface LocaleResources {
  api: Record<ResponseCodeValue, string>;
  common: {
    save: string;
    cancel: string;
    confirm: string;
    error: string;
    loading: string;
  };
  error: {
    required_field: string;
    invalid_format: string;
  };
  queue: {
    title: string;
    empty: string;
    accept: string;
    expires_in: string;
    platform: string;
    total: string;
    received_at: string;
  };
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: LocaleResources };
  }
}
