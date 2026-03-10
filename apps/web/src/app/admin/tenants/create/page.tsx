'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, CopyIcon } from 'lucide-react';
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
  contactPhone: z.string().max(20).optional(),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

interface Credentials {
  email: string;
  temporaryPassword: string;
}

interface CreateTenantResponse {
  data: {
    tenant: { id: string; name: string };
    credentials: Credentials;
  };
}

export default function CreateTenantPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const form = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      businessName: '',
      ownerFullName: '',
      ownerEmail: '',
      contactPhone: '',
    },
  });

  async function onSubmit(data: CreateTenantForm) {
    try {
      const res = await apiClient<CreateTenantResponse>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
        accessToken: session?.access_token,
      });
      setCredentials(res.data.credentials);
      toast.success('Restoran başarıyla oluşturuldu');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Bir hata oluştu');
      }
    }
  }

  async function handleCopy(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  if (credentials) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader>
            <CardTitle>Restoran Oluşturuldu</CardTitle>
            <CardDescription>
              Aşağıdaki bilgileri restoran sahibiyle paylaşın. Bu bilgiler
              tekrar gösterilemez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <FieldLabel className="text-muted-foreground text-sm">
                E-posta
              </FieldLabel>
              <div className="mt-1 flex items-center gap-2">
                <code className="bg-background flex-1 rounded px-3 py-2 text-sm">
                  {credentials.email}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(credentials.email, 'email')}
                >
                  {copied === 'email' ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <FieldLabel className="text-muted-foreground text-sm">
                Geçici Şifre
              </FieldLabel>
              <div className="mt-1 flex items-center gap-2">
                <code className="bg-background flex-1 rounded px-3 py-2 text-sm font-bold">
                  {credentials.temporaryPassword}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    handleCopy(credentials.temporaryPassword, 'password')
                  }
                >
                  {copied === 'password' ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => router.push('/admin/tenants')}
            >
              Restoran Listesine Dön
            </Button>
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
