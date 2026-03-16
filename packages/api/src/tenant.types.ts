export interface Tenant {
  id: string;
  name: string;
  contactPhone: string | null;
  status: 'active' | 'suspended' | 'inactive';
  licenseStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface TenantWithOwner extends Tenant {
  ownerName: string | null;
  ownerId: string | null;
}

export interface CreateTenantRequest {
  businessName: string;
  ownerFullName: string;
  ownerEmail: string;
  contactPhone?: string;
}

export interface CreateTenantResponse {
  tenant: TenantWithOwner;
  invitation: {
    email: string;
    sent: boolean;
  };
}
