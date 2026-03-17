import { UseGuards } from '@nestjs/common';

import { TenantGuard } from '../guards/tenant.guard';

export const RequireTenant = () => UseGuards(TenantGuard);
