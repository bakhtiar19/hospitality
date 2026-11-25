import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import {
  ChangePasswordDto,
  CreateStaffDto,
  LoginDto,
  RefreshTokenDto,
  RegisterHotelDto,
  ResetPasswordDto,
  UpdateStaffStatusDto,
} from './auth.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { UserPayload, UserRole } from '@hospitality/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register-hotel')
  @HttpCode(HttpStatus.CREATED)
  async registerHotel(@Body() dto: RegisterHotelDto) {
    return this.authService.registerHotel(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: UserPayload) {
    return this.authService.logout(user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: UserPayload) {
    return this.authService.getMe(user.sub);
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async listStaff(@CurrentPropertyId() propertyId: string) {
    return this.authService.listStaff(propertyId);
  }

  @Post('staff')
  @UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async createStaff(@CurrentPropertyId() propertyId: string, @Body() dto: CreateStaffDto) {
    return this.authService.createStaff(propertyId, dto);
  }

  @Patch('staff/:id/status')
  @UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async updateStaffStatus(
    @CurrentPropertyId() propertyId: string,
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto
  ) {
    return this.authService.updateStaffStatus(propertyId, id, user.sub, dto.isActive);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: UserPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('staff/:id/reset-password')
  @UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetStaffPassword(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto
  ) {
    return this.authService.resetStaffPassword(propertyId, id, dto.newPassword);
  }
}
