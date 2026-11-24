import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RoomTypesService, CreateRoomTypeDto, UpdateRoomTypeDto } from './room-types.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { PermissionCode } from '@hospitality/shared-types';

@Controller('room-types')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Get()
  async list(@CurrentPropertyId() propertyId: string) {
    return this.roomTypesService.list(propertyId);
  }

  @Get(':id')
  async getById(@CurrentPropertyId() propertyId: string, @Param('id') id: string) {
    return this.roomTypesService.getById(propertyId, id);
  }

  @Post()
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async create(@CurrentPropertyId() propertyId: string, @Body() dto: CreateRoomTypeDto) {
    return this.roomTypesService.create(propertyId, dto);
  }

  @Put(':id')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async update(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto
  ) {
    return this.roomTypesService.update(propertyId, id, dto);
  }

  @Delete(':id')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async delete(@CurrentPropertyId() propertyId: string, @Param('id') id: string) {
    return this.roomTypesService.delete(propertyId, id);
  }
}
