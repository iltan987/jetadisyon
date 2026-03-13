import type { Database } from './database.types';

type TenantStatus = Database['public']['Enums']['tenant_status'];
type TenantLicenseStatus = Database['public']['Enums']['tenant_license_status'];

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  active: 'Aktif',
  suspended: 'Askıda',
  inactive: 'Pasif',
};

export const TENANT_LICENSE_LABELS: Record<TenantLicenseStatus, string> = {
  trial: 'Deneme',
  active: 'Aktif',
  expired: 'Süresi Dolmuş',
  cancelled: 'İptal',
};
