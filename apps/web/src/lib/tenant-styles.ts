import type { Database } from '@repo/api/database.types';

type TenantStatus = Database['public']['Enums']['tenant_status'];
type TenantLicenseStatus = Database['public']['Enums']['tenant_license_status'];

export const TENANT_STATUS_STYLES: Record<TenantStatus, string> = {
  active:
    'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  suspended:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  inactive: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
};

export const TENANT_LICENSE_STYLES: Record<TenantLicenseStatus, string> = {
  trial:
    'border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400',
  active:
    'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400',
  expired: 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400',
  cancelled: 'border-muted text-muted-foreground',
};
