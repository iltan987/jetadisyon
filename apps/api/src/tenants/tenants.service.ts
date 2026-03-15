import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { PinoLogger } from 'nestjs-pino';

import { SupabaseService } from '../supabase/supabase.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

interface TenantRow {
  id: string;
  name: string;
  contact_phone: string | null;
  status: string;
  license_status: string;
  created_at: string;
  updated_at: string;
}

interface TenantMembershipJoin {
  profiles: { id: string; full_name: string; role: string } | null;
}

@Injectable()
export class TenantsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TenantsService.name);
  }

  async createTenant(dto: CreateTenantDto, adminUserId: string) {
    const client = this.supabaseService.getClient();
    const tempPassword = randomBytes(12).toString('base64url');

    let tenantId: string | undefined;
    let authUserId: string | undefined;

    try {
      // Step 1: Insert tenant row
      const { data: tenant, error: tenantError } = await client
        .from('tenants')
        .insert({ name: dto.businessName, contact_phone: dto.contactPhone })
        .select()
        .single();

      if (tenantError || !tenant) {
        throw new InternalServerErrorException({
          code: 'TENANT.CREATION_FAILED',
          message: 'Failed to create tenant',
        });
      }
      tenantId = tenant.id;

      // Step 2: Create Supabase Auth user
      const { data: authData, error: authError } =
        await client.auth.admin.createUser({
          email: dto.ownerEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { must_change_password: true },
        });

      if (authError || !authData.user) {
        if (
          authError?.code === 'email_exists' ||
          authError?.code === 'user_already_exists'
        ) {
          throw new ConflictException({
            code: 'TENANT.DUPLICATE_EMAIL',
            message: 'An account with this email already exists',
          });
        }
        throw new InternalServerErrorException({
          code: 'TENANT.CREATION_FAILED',
          message: 'Failed to create owner account',
        });
      }
      authUserId = authData.user.id;

      // Step 3: Insert profiles entry
      const { error: profileError } = await client.from('profiles').insert({
        id: authUserId,
        full_name: dto.ownerFullName,
        role: 'tenant_owner',
      });

      if (profileError) {
        throw new InternalServerErrorException({
          code: 'TENANT.CREATION_FAILED',
          message: 'Failed to create owner profile',
        });
      }

      // Step 4: Insert tenant_memberships entry
      const { error: membershipError } = await client
        .from('tenant_memberships')
        .insert({ user_id: authUserId, tenant_id: tenantId });

      if (membershipError) {
        throw new InternalServerErrorException({
          code: 'TENANT.CREATION_FAILED',
          message: 'Failed to create tenant membership',
        });
      }

      // Step 5: Audit log (best-effort)
      const { error: auditError } = await client.from('audit_logs').insert({
        actor_id: adminUserId,
        action: 'CREATE_TENANT',
        entity_type: 'TENANT',
        entity_id: tenantId,
        metadata: {
          owner_email: dto.ownerEmail,
          business_name: dto.businessName,
        },
      });

      if (auditError) {
        this.logger.error(
          { auditError, action: 'CREATE_TENANT', entityId: tenantId },
          'Failed to write audit log for critical action',
        );
      }

      return {
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            contactPhone: tenant.contact_phone,
            status: tenant.status,
            licenseStatus: tenant.license_status,
            createdAt: tenant.created_at,
            updatedAt: tenant.updated_at,
            ownerName: dto.ownerFullName,
            ownerId: authUserId,
          },
          credentials: {
            email: dto.ownerEmail,
            temporaryPassword: tempPassword,
          },
        },
      };
    } catch (error) {
      // Cleanup on failure (reverse order)
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        await this.cleanup(client, tenantId, authUserId);
      }
      throw error;
    }
  }

  async findAll() {
    const client = this.supabaseService.getClient();

    // Join tenants → tenant_memberships → profiles to get owner info
    // Non-inner join so orphaned tenants (no memberships) still appear
    const { data, error } = await client
      .from('tenants')
      .select(
        `
        *,
        tenant_memberships (
          profiles (
            id,
            full_name,
            role
          )
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error({ error }, 'Failed to fetch tenants');
      throw new InternalServerErrorException({
        code: 'TENANT.FETCH_FAILED',
        message: 'Failed to fetch tenants',
      });
    }

    const tenants = (data ?? []).map((t) =>
      this.mapTenantWithOwner(
        t as TenantRow,
        t.tenant_memberships as TenantMembershipJoin[],
      ),
    );

    return { data: tenants };
  }

  async findById(tenantId: string, currentUser: User, accessToken: string) {
    const userRole = currentUser.app_metadata.user_role;

    // Admin uses service-role client (cross-tenant access);
    // non-admin uses user-scoped client (RLS enforces tenant isolation)
    const client =
      userRole === 'admin'
        ? this.supabaseService.getClient()
        : this.supabaseService.getClientForUser(accessToken);

    const { data, error } = await client
      .from('tenants')
      .select(
        `
        *,
        tenant_memberships (
          profiles (
            id,
            full_name,
            role
          )
        )
      `,
      )
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException({
        code: 'TENANT.NOT_FOUND',
        message: 'Tenant not found',
      });
    }

    return {
      data: this.mapTenantWithOwner(
        data as TenantRow,
        data.tenant_memberships as TenantMembershipJoin[],
      ),
    };
  }

  private mapTenantWithOwner(
    tenant: TenantRow,
    memberships?: TenantMembershipJoin[],
  ) {
    const ownerProfile = (memberships ?? []).find(
      (tm) => tm.profiles?.role === 'tenant_owner',
    )?.profiles;

    return {
      id: tenant.id,
      name: tenant.name,
      contactPhone: tenant.contact_phone,
      status: tenant.status,
      licenseStatus: tenant.license_status,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
      ownerName: ownerProfile?.full_name ?? null,
      ownerId: ownerProfile?.id ?? null,
    };
  }

  private async cleanup(
    client: ReturnType<SupabaseService['getClient']>,
    tenantId?: string,
    authUserId?: string,
  ) {
    if (authUserId) {
      try {
        // Deleting auth user cascades to profiles and tenant_memberships
        await client.auth.admin.deleteUser(authUserId);
      } catch (cleanupError) {
        this.logger.error(
          { cleanupError, authUserId },
          'Failed to delete auth user during cleanup',
        );
      }
    }
    if (tenantId) {
      try {
        await client.from('tenants').delete().eq('id', tenantId);
      } catch (cleanupError) {
        this.logger.error(
          { cleanupError, tenantId },
          'Failed to delete tenant during cleanup',
        );
      }
    }
  }
}
