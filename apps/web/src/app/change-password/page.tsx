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
// at apps/api/src/auth/dto/change-password.dto.ts
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, { error: 'Şifre en az 8 karakter olmalı' }),
    newPassword: z.string().min(8, { error: 'Şifre en az 8 karakter olmalı' }),
    confirmPassword: z
      .string()
      .min(8, { error: 'Şifre en az 8 karakter olmalı' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Şifreler eşleşmeli',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Yeni şifre mevcut şifreden farklı olmalı',
    path: ['newPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { session, setMustChangePassword } = useAuth();
  const [generalError, setGeneralError] = useState('');

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    setGeneralError('');

    try {
      const data = await apiClient<{
        message: string;
        accessToken: string | null;
        refreshToken: string | null;
      }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(values),
        accessToken: session?.access_token,
      });

      // Set fresh session from backend (old refresh token is invalidated
      // by the password change, so refreshSession() would fail and trigger
      // a SIGNED_OUT event)
      if (data.accessToken && data.refreshToken) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });
      }

      setMustChangePassword(false);
      toast.success('Şifre başarıyla değiştirildi');
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'AUTH.INVALID_CREDENTIALS') {
          setGeneralError('Mevcut şifre yanlış');
        } else if (err.code === 'AUTH.PASSWORD_UPDATE_FAILED') {
          setGeneralError('Şifre güncellenemedi. Lütfen tekrar deneyin.');
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
            <CardTitle className="text-xl">Şifre Değiştir</CardTitle>
            <CardDescription>
              İlk giriş için şifrenizi değiştirmeniz gerekmektedir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="currentPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="currentPassword">
                        Mevcut Şifre
                      </FieldLabel>
                      <Input
                        {...field}
                        id="currentPassword"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        className="h-11"
                        autoComplete="current-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
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
                    ? 'Şifre değiştiriliyor...'
                    : 'Şifre Değiştir'}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
