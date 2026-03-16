import type { ZodType } from 'zod';

import { clientEnv } from './env/client';
import { createClient } from './supabase/client';

const API_BASE_URL = clientEnv.NEXT_PUBLIC_API_URL;

/**
 * Centralized Turkish translations for known API error codes.
 * Pages can still override via err.code checks for context-specific messages.
 */
const ERROR_MESSAGES: Record<string, string> = {
  'SYSTEM.RATE_LIMITED':
    'Çok fazla istek gönderildi. Lütfen bir süre bekleyip tekrar deneyin.',
  'AUTH.UNAUTHORIZED': 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  'AUTH.FORBIDDEN': 'Bu işlem için yetkiniz yok.',
  'TENANT.DUPLICATE_EMAIL': 'Bu e-posta adresi zaten kullanılıyor.',
  'TENANT.CREATION_FAILED': 'Restoran oluşturulamadı. Lütfen tekrar deneyin.',
  'TENANT.NOT_FOUND': 'Restoran bulunamadı.',
  'TENANT.INVITATION_NOT_PENDING':
    'Restoran sahibi davetini zaten kabul etmiş.',
  'TENANT.RESEND_FAILED':
    'Davet bağlantısı oluşturulamadı. Lütfen tekrar deneyin.',
  'AUTH.INVALID_CREDENTIALS': 'E-posta veya şifre hatalı.',
  'AUTH.SET_PASSWORD_FAILED': 'Şifre belirlenemedi. Lütfen tekrar deneyin.',
  'AUTH.NOT_INVITATION_USER':
    'Bu işlem sadece davet edilen kullanıcılar içindir.',
  'AUTH.PASSWORD_UPDATE_FAILED': 'Şifre güncellenemedi. Lütfen tekrar deneyin.',
};

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

interface ApiErrorResponse {
  error: ApiError;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface ApiEnvelope<T> {
  data: T;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit & {
    accessToken?: string;
    timeout?: number;
    schema?: ZodType<T>;
  } = {},
): Promise<T> {
  const { accessToken, timeout = 30_000, schema, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const signal = fetchOptions.signal
    ? AbortSignal.any([controller.signal, fetchOptions.signal])
    : controller.signal;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal,
    });

    if (!response.ok) {
      // Stale/invalid session — sign out to clear cookies and redirect to login
      if (response.status === 401) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }

      let body: ApiErrorResponse;
      try {
        body = (await response.json()) as ApiErrorResponse;
      } catch {
        throw new ApiClientError(
          response.status,
          'SYSTEM.NETWORK_ERROR',
          `Sunucu hatası (${response.status})`,
        );
      }
      const errorCode = body.error?.code ?? 'UNKNOWN';
      const errorMessage =
        ERROR_MESSAGES[errorCode] ?? body.error?.message ?? 'Bir hata oluştu';
      throw new ApiClientError(
        response.status,
        errorCode,
        errorMessage,
        body.error?.details,
      );
    }

    const json = (await response.json()) as ApiEnvelope<T>;
    const data = json.data;

    if (schema) {
      return schema.parse(data) as T;
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(
        0,
        'SYSTEM.TIMEOUT',
        `İstek zaman aşımına uğradı (${timeout / 1000}s)`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
