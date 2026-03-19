'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js';
import { MailIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type {
  CreateTenantResponse,
  TenantWithOwner,
} from '@repo/api/tenant.types';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { queryKeys } from '@/lib/query-keys';

const createTenantSchema = z.object({
  businessName: z
    .string()
    .min(2, 'İşletme adı en az 2 karakter olmalıdır')
    .max(100),
  ownerFullName: z
    .string()
    .min(2, 'Sahip adı en az 2 karakter olmalıdır')
    .max(100),
  ownerEmail: z.email('Geçerli bir e-posta adresi giriniz'),
  contactPhone: z
    .string()
    .max(20)
    .optional()
    .transform((v) => v || undefined)
    .refine(
      (v) => !v || isValidPhoneNumber(v),
      'Geçerli bir telefon numarası giriniz (ör: +905551234567)',
    )
    .transform((v) => (v ? parsePhoneNumberWithError(v).format('E.164') : v)),
});

type CreateTenantFormInput = z.input<typeof createTenantSchema>;
type CreateTenantFormOutput = z.infer<typeof createTenantSchema>;

export default function CreateTenantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [createdTenant, setCreatedTenant] = useState<{
    tenantId: string;
    email: string;
  } | null>(null);
  const [resending, setResending] = useState(false);

  const form = useForm<CreateTenantFormInput, unknown, CreateTenantFormOutput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      businessName: '',
      ownerFullName: '',
      ownerEmail: '',
      contactPhone: '',
    },
  });

  async function onSubmit(data: CreateTenantFormOutput) {
    try {
      const res = await apiClient<CreateTenantResponse>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
        accessToken: session?.access_token,
      });
      queryClient.setQueryData<TenantWithOwner[]>(
        queryKeys.tenants.all,
        (prev) => (prev ? [...prev, res.tenant] : [res.tenant]),
      );
      setCreatedTenant({
        tenantId: res.tenant.id,
        email: res.invitation.email,
      });
      if (res.invitation.sent) {
        toast.success('Restoran başarıyla oluşturuldu');
      } else {
        toast.warning(
          'Restoran oluşturuldu ancak davet e-postası gönderilemedi. Lütfen tekrar gönderin.',
        );
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Bir hata oluştu');
      }
    }
  }

  async function handleResendInvitation() {
    if (!createdTenant) return;
    setResending(true);
    try {
      await apiClient(`/tenants/${createdTenant.tenantId}/resend-invitation`, {
        method: 'POST',
        accessToken: session?.access_token,
      });
      toast.success(
        `Davet e-postası tekrar gönderildi: ${createdTenant.email}`,
      );
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Davet gönderilemedi');
      }
    } finally {
      setResending(false);
    }
  }

  if (createdTenant) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader>
            <CardTitle>Restoran Oluşturuldu</CardTitle>
            <CardDescription>
              Restoran sahibine davet e-postası gönderildi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MailIcon className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  Davet e-postası gönderildi: {createdTenant.email}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Restoran sahibi e-postadaki bağlantıya tıklayarak şifresini
                  belirleyecektir.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleResendInvitation}
                disabled={resending}
              >
                {resending ? 'Gönderiliyor...' : 'Daveti Tekrar Gönder'}
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push('/admin/tenants')}
              >
                Restoran Listesine Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Restoran Ekle</CardTitle>
          <CardDescription>
            Yeni bir restoran ve sahip hesabı oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="create-tenant-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="businessName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="businessName">İşletme Adı</FieldLabel>
                    <Input
                      {...field}
                      id="businessName"
                      aria-invalid={fieldState.invalid}
                      placeholder="Örnek: Ali Usta Kebap"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="ownerFullName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="ownerFullName">
                      Sahip Adı Soyadı
                    </FieldLabel>
                    <Input
                      {...field}
                      id="ownerFullName"
                      aria-invalid={fieldState.invalid}
                      placeholder="Örnek: Ali Yılmaz"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="ownerEmail"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="ownerEmail">Sahip E-posta</FieldLabel>
                    <Input
                      {...field}
                      id="ownerEmail"
                      type="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="ornek@email.com"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="contactPhone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="contactPhone">
                      Telefon (Opsiyonel)
                    </FieldLabel>
                    <Input
                      {...field}
                      id="contactPhone"
                      type="tel"
                      aria-invalid={fieldState.invalid}
                      placeholder="+90 555 123 4567"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            form="create-tenant-form"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? 'Oluşturuluyor...'
              : 'Restoran Oluştur'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
