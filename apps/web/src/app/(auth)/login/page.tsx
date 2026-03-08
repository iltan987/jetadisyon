'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
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
import { apiClient, ApiClientError } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { LoginResponse } from '@repo/api/auth.types';

const loginSchema = z.object({
  email: z.email({ error: 'Geçerli bir e-posta adresi girin' }),
  password: z.string().min(8, { error: 'Şifre en az 8 karakter olmalıdır' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setGeneralError('');

    try {
      const { data } = await apiClient<{ data: LoginResponse }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      const supabase = createClient();
      await supabase.auth.setSession({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
      });

      router.push('/admin/overview');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 429) {
          setGeneralError('Çok fazla deneme. Lütfen 15 dakika bekleyin.');
        } else if (err.code === 'AUTH.INVALID_CREDENTIALS') {
          setGeneralError('E-posta veya şifre hatalı.');
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Giriş Yap</CardTitle>
        <CardDescription>
          Hesabınıza giriş yapmak için bilgilerinizi girin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">E-posta</FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="ornek@sirket.com"
                    aria-invalid={fieldState.invalid}
                    className="h-11"
                    autoComplete="email"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Şifre</FieldLabel>
                  <Input
                    {...field}
                    id="password"
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

            {generalError && (
              <p className="text-sm text-destructive">{generalError}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
