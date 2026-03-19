import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Pencil, Trash2 } from 'lucide-react';

import {
  TENANT_LICENSE_LABELS,
  TENANT_STATUS_LABELS,
} from '@repo/api/tenant.constants';
import type { TenantWithOwner } from '@repo/api/tenant.types';
import type {
  ColumnDef,
  DataTableFilterTabs,
  FilterFn,
} from '@repo/ui/components/data-table';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';

import {
  TENANT_LICENSE_STYLES,
  TENANT_STATUS_STYLES,
} from '@/lib/tenant-styles';

// ─── Column widths ───────────────────────────────────────────────────────────

export const COLUMN_WIDTHS: Record<string, number> = {
  name: 220,
  ownerName: 180,
  status: 120,
  licenseStatus: 140,
  contactPhone: 160,
  createdAt: 140,
  actions: 100,
};

// ─── Search ──────────────────────────────────────────────────────────────────

export const globalFilterFn: FilterFn<TenantWithOwner> = (
  row,
  _id,
  value: string,
) => {
  const q = value.toLowerCase();
  const { name, ownerName } = row.original;
  return (
    name.toLowerCase().includes(q) ||
    (ownerName?.toLowerCase().includes(q) ?? false)
  );
};

// ─── Filter tabs ─────────────────────────────────────────────────────────────

export const STATUS_FILTER_TABS: DataTableFilterTabs = {
  columnId: 'status',
  allLabel: 'Tümü',
  options: [
    { value: 'active', label: TENANT_STATUS_LABELS.active },
    { value: 'suspended', label: TENANT_STATUS_LABELS.suspended },
    { value: 'inactive', label: TENANT_STATUS_LABELS.inactive },
  ],
};

// ─── Column definitions ──────────────────────────────────────────────────────

export interface TenantColumnActions {
  onEdit: (tenant: TenantWithOwner) => void;
  onDelete: (tenant: TenantWithOwner) => void;
}

export function getColumns(
  actions: TenantColumnActions,
): ColumnDef<TenantWithOwner>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'İşletme Adı',
      cell: ({ row: { original: t } }) => (
        <span className="text-foreground truncate text-sm font-medium">
          {t.name}
        </span>
      ),
    },
    {
      id: 'ownerName',
      accessorKey: 'ownerName',
      header: 'Sahip',
      cell: ({ row: { original: t } }) => (
        <span className="text-muted-foreground truncate text-sm">
          {t.ownerName ?? '—'}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      cell: ({ row: { original: t } }) => (
        <Badge
          className={`h-auto px-2.5 py-1 ${TENANT_STATUS_STYLES[t.status]}`}
        >
          {TENANT_STATUS_LABELS[t.status] ?? t.status}
        </Badge>
      ),
    },
    {
      id: 'licenseStatus',
      accessorKey: 'licenseStatus',
      header: 'Lisans',
      cell: ({ row: { original: t } }) => (
        <Badge
          variant="outline"
          className={`h-auto px-2.5 py-1 ${TENANT_LICENSE_STYLES[t.licenseStatus]}`}
        >
          {TENANT_LICENSE_LABELS[t.licenseStatus] ?? t.licenseStatus}
        </Badge>
      ),
    },
    {
      id: 'contactPhone',
      accessorKey: 'contactPhone',
      header: 'Telefon',
      cell: ({ row: { original: t } }) => {
        const formatted = t.contactPhone
          ? (parsePhoneNumberFromString(
              t.contactPhone,
            )?.formatInternational() ?? t.contactPhone)
          : null;
        return (
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatted ?? '—'}
          </span>
        );
      },
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Kayıt Tarihi',
      cell: ({ row: { original: t } }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {new Date(t.createdAt).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'İşlemler',
      enableSorting: false,
      cell: ({ row: { original: t } }) => (
        <TooltipProvider delay={300}>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.onEdit(t);
                    }}
                  />
                }
              >
                <Pencil className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Düzenle</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.onDelete(t);
                    }}
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Sil</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];
}
