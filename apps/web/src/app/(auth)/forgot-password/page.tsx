'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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

import { apiClient, ApiClientError } from '@/lib/api-client';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { error: 'E-posta gereklidir' })
    .email({ error: 'Geçerli bir e-posta girin' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setRateLimited(false);
    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    } catch (err) {
      // Surface rate limiting — user needs to know to wait
      if (err instanceof ApiClientError && err.status === 429) {
        setRateLimited(true);
        return;
      }
      // All other errors: show success message (no email leak)
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">E-posta Gönderildi</CardTitle>
          <CardDescription>
            E-postanıza şifre sıfırlama bağlantısı gönderdik. Gelen kutunuzu
            kontrol edin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Giriş Sayfasına Dön
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Şifremi Unuttum</CardTitle>
        <CardDescription>
          E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim
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

            {rateLimited && (
              <p className="text-destructive text-sm">
                Çok fazla deneme. Lütfen 15 dakika bekleyin.
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? 'Gönderiliyor...'
                : 'Sıfırlama Bağlantısı Gönder'}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Giriş sayfasına dön
              </Link>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
