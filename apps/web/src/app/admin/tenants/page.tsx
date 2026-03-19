'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { TenantWithOwner } from '@repo/api/tenant.types';
import { DataTable } from '@repo/ui/components/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Skeleton } from '@repo/ui/components/ui/skeleton';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

import {
  COLUMN_WIDTHS,
  getColumns,
  globalFilterFn,
  STATUS_FILTER_TABS,
} from './columns';

function LoadingSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>
      <div className="rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b p-3 last:border-b-0">
            <Skeleton className="h-4 w-55" />
            <Skeleton className="h-4 w-45" />
            <Skeleton className="h-6 w-25 rounded-full" />
            <Skeleton className="h-6 w-30 rounded-full" />
            <Skeleton className="h-4 w-35" />
            <Skeleton className="h-4 w-30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, isLoading: isAuthLoading } = useAuth();

  const [deletingTenant, setDeletingTenant] = useState<TenantWithOwner | null>(
    null,
  );

  const {
    data: tenants = [],
    isLoading: isQueryLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.tenants.all,
    queryFn: () =>
      apiClient<TenantWithOwner[]>('/tenants', {
        accessToken: session!.access_token,
      }),
    enabled: !!session?.access_token,
  });

  const deleteMutation = useMutation({
    mutationFn: (tenantId: string) =>
      apiClient(`/tenants/${tenantId}`, {
        method: 'DELETE',
        accessToken: session!.access_token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all });
      toast.success(`"${deletingTenant?.name}" silindi.`);
      setDeletingTenant(null);
    },
    onError: () => {
      toast.error('Restoran silinirken bir hata oluştu.');
    },
  });

  const handleEdit = useCallback(
    (tenant: TenantWithOwner) => {
      router.push(`/admin/tenants/${tenant.id}/edit`);
    },
    [router],
  );

  const handleDelete = useCallback((tenant: TenantWithOwner) => {
    setDeletingTenant(tenant);
  }, []);

  const columns = useMemo(
    () => getColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  const isLoading = isAuthLoading || isQueryLoading;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
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
      ) : isLoading ? (
        <LoadingSkeleton />
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
        <DataTable
          data={tenants}
          columns={columns}
          columnWidths={COLUMN_WIDTHS}
          getRowId={(row) => row.id}
          globalFilterFn={globalFilterFn}
          searchPlaceholder="İşletme veya sahip ara..."
          filterTabs={STATUS_FILTER_TABS}
          defaultPageSize={10}
          pageSizeOptions={[5, 10, 20]}
          totalLabel="restoran"
        />
      )}

      <AlertDialog
        open={!!deletingTenant}
        onOpenChange={(open) => {
          if (!open) setDeletingTenant(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restoranı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingTenant?.name}</strong> restoranını silmek
              istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingTenant) {
                  deleteMutation.mutate(deletingTenant.id);
                }
              }}
            >
              {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
