'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';

import { useAuth } from '@/hooks/use-auth';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

// SYNC: Backend has a mirrored schema with English error messages
// at apps/api/src/auth/dto/reset-password.dto.ts
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { error: 'Şifre en az 8 karakter olmalıdır' }),
    confirmPassword: z
      .string()
      .min(8, { error: 'Şifre en az 8 karakter olmalıdır' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [generalError, setGeneralError] = useState('');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    setGeneralError('');

    if (!session?.access_token) {
      setGeneralError(
        'Oturumunuz sona erdi. Lütfen yeni bir sıfırlama bağlantısı isteyin.',
      );
      return;
    }

    try {
      const data = await apiClient<{
        message: string;
        accessToken: string | null;
        refreshToken: string | null;
      }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(values),
        accessToken: session?.access_token,
      });

      // Set fresh session from backend
      if (data.accessToken && data.refreshToken) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });
      }

      toast.success('Şifre başarıyla sıfırlandı');
      router.refresh();
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'AUTH.RECOVERY_SESSION_REQUIRED') {
          setGeneralError(
            'Bu sayfa sadece şifre sıfırlama bağlantısı ile erişilebilir.',
          );
        } else if (err.code === 'AUTH.PASSWORD_RESET_FAILED') {
          setGeneralError('Şifre sıfırlanamadı. Lütfen tekrar deneyin.');
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Yeni Şifre Belirle</CardTitle>
            <CardDescription>
              Yeni şifrenizi girerek hesabınızı kurtarın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="newPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="newPassword">Yeni Şifre</FieldLabel>
                      <Input
                        {...field}
                        id="newPassword"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        className="h-11"
                        autoComplete="new-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                      <p className="text-muted-foreground text-xs">
                        En az 8 karakter
                      </p>
                    </Field>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="confirmPassword">
                        Yeni Şifre (Tekrar)
                      </FieldLabel>
                      <Input
                        {...field}
                        id="confirmPassword"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        className="h-11"
                        autoComplete="new-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                {generalError && (
                  <p className="text-destructive text-sm">{generalError}</p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? 'Şifre sıfırlanıyor...'
                    : 'Şifremi Sıfırla'}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
