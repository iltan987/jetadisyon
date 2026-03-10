import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';

import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @Roles('admin', 'tenant_owner')
  async findById(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.findById(tenantId, user);
  }
}
