'use client';

import { useQuery } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

import type { TenantWithOwner } from '@repo/api/tenant.types';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

const statusLabels: Record<string, string> = {
  active: 'Aktif',
  suspended: 'Askıda',
  inactive: 'Pasif',
};

const statusStyles: Record<string, string> = {
  active:
    'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  suspended:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  inactive: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
};

const licenseLabels: Record<string, string> = {
  trial: 'Deneme',
  active: 'Aktif',
  expired: 'Süresi Dolmuş',
  cancelled: 'İptal',
};

const licenseStyles: Record<string, string> = {
  trial:
    'border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400',
  active:
    'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400',
  expired: 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400',
  cancelled: 'border-muted text-muted-foreground',
};

export default function TenantsPage() {
  const { session, isLoading: isAuthLoading } = useAuth();

  const {
    data: tenants = [],
    isLoading: isQueryLoading,
    error,
  } = useQuery({
    queryKey: ['tenants'],
    queryFn: () =>
      apiClient<{ data: TenantWithOwner[] }>('/tenants', {
        accessToken: session!.access_token,
      }).then((res) => res.data),
    enabled: !!session?.access_token,
  });

  const isLoading = isAuthLoading || isQueryLoading;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Restoranlar</h1>
        <Button
          nativeButton={false}
          render={<Link href="/admin/tenants/create" />}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Restoran Ekle
        </Button>
      </div>

      {error ? (
        <div className="border-destructive/50 bg-destructive/10 mt-6 rounded-md border p-4 text-center">
          <p className="text-destructive text-sm">
            Restoranlar yüklenirken bir hata oluştu.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Lütfen sayfayı yenileyerek tekrar deneyin.
          </p>
        </div>
      ) : !isLoading && tenants.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-medium">Henüz restoran eklenmemiş.</p>
          <p className="text-muted-foreground mt-1">
            İlk restoranı ekleyerek başlayın.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/admin/tenants/create" />}
            className="mt-4"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Restoran Ekle
          </Button>
        </div>
      ) : (
        <Table className="mt-6 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">İşletme Adı</TableHead>
              <TableHead className="w-[25%]">Sahip</TableHead>
              <TableHead className="w-[15%]">Durum</TableHead>
              <TableHead className="w-[15%]">Lisans</TableHead>
              <TableHead className="w-[15%]">Oluşturulma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-2/3" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-4/5" />
                    </TableCell>
                  </TableRow>
                ))
              : tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.ownerName ?? '-'}</TableCell>
                    <TableCell>
                      <Badge
                        className={`h-auto px-2.5 py-1 ${statusStyles[tenant.status]}`}
                      >
                        {statusLabels[tenant.status] ?? tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`h-auto px-2.5 py-1 ${licenseStyles[tenant.licenseStatus]}`}
                      >
                        {licenseLabels[tenant.licenseStatus] ??
                          tenant.licenseStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
