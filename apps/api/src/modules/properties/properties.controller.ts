import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PropertiesService } from './properties.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from './guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentPropertyId } from './decorators/current-property.decorator.js';
import { PermissionCode, UserRole } from '@hospitality/shared-types';

class UpdatePropertyStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

class CreateClientHotelDto {
  @IsString()
  @IsNotEmpty()
  hotelName!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  superiorRooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  deluxeRooms?: number;
}

class AdminResetOwnerPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

@Controller('properties')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async listMyProperties(@CurrentPropertyId() propertyId: string) {
    return this.propertiesService.listPropertyScoped(propertyId);
  }

  @Get('current')
  async getCurrentProperty(@CurrentPropertyId() propertyId: string) {
    return this.propertiesService.getProperty(propertyId);
  }

  @Put('current')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async updateCurrentProperty(
    @CurrentPropertyId() propertyId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.propertiesService.updatePropertySettings(propertyId, body);
  }
}

@Controller('admin/properties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminPropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async listAllConnectedProperties() {
    return this.propertiesService.listAllConnectedPropertiesForAdmin();
  }

  @Post()
  async createClientHotel(@Body() dto: CreateClientHotelDto) {
    return this.propertiesService.createClientHotelForAdmin(dto);
  }

  @Patch(':id/status')
  async updatePropertyStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyStatusDto
  ) {
    return this.propertiesService.updatePropertyStatusForAdmin(id, dto.isActive);
  }

  @Post(':id/reset-owner-password')
  async resetOwnerPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetOwnerPasswordDto
  ) {
    return this.propertiesService.resetOwnerPasswordForAdmin(id, dto.newPassword);
  }
}
