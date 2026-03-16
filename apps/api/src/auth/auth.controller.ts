import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { minutes, Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
  type ChangePasswordDto,
  changePasswordSchema,
} from './dto/change-password.dto';
import { type LoginDto, loginSchema } from './dto/login.dto';
import { type RefreshDto, refreshSchema } from './dto/refresh.dto';
import {
  type SetInitialPasswordDto,
  setInitialPasswordSchema,
} from './dto/set-initial-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Post('refresh')
  @Public()
  async refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto) {
    return this.authService.refreshSession(dto.refreshToken);
  }

  @Post('change-password')
  @Roles('tenant_owner', 'tenant_staff')
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  async changePassword(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    if (!user.email) {
      throw new UnauthorizedException({
        code: 'AUTH.USER_NOT_FOUND',
        message: 'User email not available',
      });
    }
    return this.authService.changePassword(user.id, user.email, dto);
  }

  @Post('set-initial-password')
  @Roles('tenant_owner', 'tenant_staff')
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  async setInitialPassword(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(setInitialPasswordSchema))
    dto: SetInitialPasswordDto,
  ) {
    if (!user.email) {
      throw new UnauthorizedException({
        code: 'AUTH.USER_NOT_FOUND',
        message: 'User email not available',
      });
    }
    return this.authService.setInitialPassword(
      user.id,
      user.email,
      user.user_metadata,
      dto,
    );
  }

  @Get('me')
  async me(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }
}
