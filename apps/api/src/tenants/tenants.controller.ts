import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { minutes, Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';

import { AccessToken } from '../common/decorators/access-token.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import { createTenantSchema } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles('admin')
  async create(
    @Body(new ZodValidationPipe(createTenantSchema)) dto: CreateTenantDto,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.createTenant(dto, user.id);
  }

  @Get()
  @Roles('admin')
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':tenantId')
  @Roles('admin', 'owner')
  @RequireTenant()
  async findById(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: User,
    @AccessToken() accessToken: string,
  ) {
    return this.tenantsService.findById(tenantId, user, accessToken);
  }

  @Delete(':tenantId')
  @Roles('admin')
  async remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.deleteTenant(tenantId, user.id);
  }

  @Post(':tenantId/resend-invitation')
  @Roles('admin')
  @Throttle({ default: { limit: 3, ttl: minutes(15) } })
  async resendInvitation(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.tenantsService.resendInvitation(tenantId);
  }
}
