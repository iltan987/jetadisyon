'use client';

import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

export default function TenantsPage() {
  const { session } = useAuth();
  const [tenants, setTenants] = useState<TenantWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;

    apiClient<{ data: TenantWithOwner[] }>('/tenants', {
      accessToken: session.access_token,
    })
      .then((res) => setTenants(res.data))
      .catch(() => setTenants([]))
      .finally(() => setIsLoading(false));
  }, [session?.access_token]);

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

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
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
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>İşletme Adı</TableHead>
              <TableHead>Sahip</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Lisans</TableHead>
              <TableHead>Oluşturulma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell>{tenant.ownerName ?? '-'}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      tenant.status === 'active' ? 'default' : 'secondary'
                    }
                  >
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{tenant.licenseStatus}</Badge>
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
