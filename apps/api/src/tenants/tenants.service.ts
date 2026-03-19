import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@supabase/supabase-js';
import { PinoLogger } from 'nestjs-pino';

import type { TenantRole } from '@repo/api';

import { MailService } from '../mail/mail.service';
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
  role: TenantRole;
  profiles: { id: string; full_name: string } | null;
}

@Injectable()
export class TenantsService {
  private readonly appUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TenantsService.name);
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
  }

  async createTenant(dto: CreateTenantDto, adminUserId: string) {
    const client = this.supabaseService.getClient();

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

      // Step 2: Generate invitation link (no password set, no email sent by Supabase)
      const { data: linkData, error: linkError } =
        await client.auth.admin.generateLink({
          type: 'invite',
          email: dto.ownerEmail,
          options: {
            data: { invitation_pending: true },
          },
        });

      if (linkError || !linkData.user) {
        if (
          linkError?.code === 'email_exists' ||
          linkError?.code === 'user_already_exists'
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
      authUserId = linkData.user.id;
      const hashedToken = linkData.properties.hashed_token;

      // Step 3: Insert profiles entry
      const { error: profileError } = await client.from('profiles').insert({
        id: authUserId,
        full_name: dto.ownerFullName,
        role: 'user',
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
        .insert({ user_id: authUserId, tenant_id: tenantId, role: 'owner' });

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

      // Step 6: Send invitation email via Nodemailer (best-effort — tenant is
      // already created, admin can resend if email delivery fails)
      const inviteLink = `${this.appUrl}/auth/accept-invite?token_hash=${encodeURIComponent(hashedToken)}&type=invite`;
      let emailSent = false;
      try {
        await this.mailService.sendInvitationEmail(
          dto.ownerEmail,
          inviteLink,
          dto.businessName,
        );
        emailSent = true;
      } catch (emailError) {
        this.logger.error(
          { emailError, email: dto.ownerEmail, tenantId },
          'Failed to send invitation email — tenant created, admin can resend',
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
          invitation: {
            email: dto.ownerEmail,
            sent: emailSent,
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
          role,
          profiles (
            id,
            full_name
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
    const systemRole = currentUser.app_metadata.system_role;

    // Admin uses service-role client (cross-tenant access);
    // non-admin uses user-scoped client (RLS enforces tenant isolation)
    const client =
      systemRole === 'admin'
        ? this.supabaseService.getClient()
        : this.supabaseService.getClientForUser(accessToken);

    const { data, error } = await client
      .from('tenants')
      .select(
        `
        *,
        tenant_memberships (
          role,
          profiles (
            id,
            full_name
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

  async deleteTenant(tenantId: string, adminUserId: string) {
    const client = this.supabaseService.getClient();

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await client
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single()
      .overrideTypes<{ id: string; name: string }>();

    if (tenantError || !tenant) {
      throw new NotFoundException({
        code: 'TENANT.NOT_FOUND',
        message: 'Tenant not found',
      });
    }

    // Delete tenant row (tenant_memberships cascade via DB FK)
    const { error: deleteError } = await client
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (deleteError) {
      this.logger.error({ deleteError, tenantId }, 'Failed to delete tenant');
      throw new InternalServerErrorException({
        code: 'TENANT.DELETE_FAILED',
        message: 'Failed to delete tenant',
      });
    }

    // Audit log (best-effort)
    const { error: auditError } = await client.from('audit_logs').insert({
      actor_id: adminUserId,
      action: 'DELETE_TENANT',
      entity_type: 'TENANT',
      entity_id: tenantId,
      metadata: { business_name: tenant.name },
    });

    if (auditError) {
      this.logger.error(
        { auditError, action: 'DELETE_TENANT', entityId: tenantId },
        'Failed to write audit log for critical action',
      );
    }

    this.logger.info({ tenantId, tenantName: tenant.name }, 'Tenant deleted');

    return { data: { id: tenantId } };
  }

  async resendInvitation(tenantId: string) {
    const client = this.supabaseService.getClient();

    // Look up tenant name
    const { data: tenant, error: tenantError } = await client
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
      .overrideTypes<{ name: string }>();

    if (tenantError || !tenant) {
      throw new NotFoundException({
        code: 'TENANT.NOT_FOUND',
        message: 'Tenant not found',
      });
    }

    // Look up tenant owner (filter by role — future staff members won't match)
    const { data: membership, error: membershipError } = await client
      .from('tenant_memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .single()
      .overrideTypes<{ user_id: string }>();

    if (membershipError || !membership) {
      throw new NotFoundException({
        code: 'TENANT.NOT_FOUND',
        message: 'Tenant owner not found',
      });
    }

    const ownerId = membership.user_id;
    const tenantName = tenant.name;

    // Get user metadata to verify invitation is pending
    const { data: userData, error: userError } =
      await client.auth.admin.getUserById(ownerId);

    if (userError || !userData.user) {
      throw new NotFoundException({
        code: 'TENANT.NOT_FOUND',
        message: 'Tenant owner not found',
      });
    }

    const ownerEmail = userData.user.email;
    if (!ownerEmail) {
      throw new InternalServerErrorException({
        code: 'TENANT.RESEND_FAILED',
        message: 'Owner email not available',
      });
    }

    if (userData.user.user_metadata?.invitation_pending !== true) {
      throw new BadRequestException({
        code: 'TENANT.INVITATION_NOT_PENDING',
        message: 'Owner has already accepted the invitation',
      });
    }

    // Generate fresh invitation link
    const { data: linkData, error: linkError } =
      await client.auth.admin.generateLink({
        type: 'invite',
        email: ownerEmail,
        options: {
          data: { invitation_pending: true },
        },
      });

    if (linkError || !linkData.properties) {
      throw new InternalServerErrorException({
        code: 'TENANT.RESEND_FAILED',
        message: 'Failed to generate new invitation link',
      });
    }

    const inviteLink = `${this.appUrl}/auth/accept-invite?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=invite`;
    await this.mailService.sendInvitationEmail(
      ownerEmail,
      inviteLink,
      tenantName,
    );

    this.logger.info(
      { tenantId, email: ownerEmail },
      'Invitation email resent',
    );

    return {
      data: {
        email: ownerEmail,
        sent: true,
      },
    };
  }

  private mapTenantWithOwner(
    tenant: TenantRow,
    memberships?: TenantMembershipJoin[],
  ) {
    const ownerMembership = (memberships ?? []).find(
      (tm) => tm.role === 'owner',
    );
    const ownerProfile = ownerMembership?.profiles;

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
