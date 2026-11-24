import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomsService, CreateRoomDto, UpdateRoomDto, BulkCreateRoomsDto } from './rooms.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { PermissionCode } from '@hospitality/shared-types';

@Controller('rooms')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async listRooms(
    @CurrentPropertyId() propertyId: string,
    @Query('floorId') floorId?: string,
    @Query('roomTypeId') roomTypeId?: string
  ) {
    return this.roomsService.listRooms(propertyId, floorId, roomTypeId);
  }

  @Get('floors')
  async listFloors(@CurrentPropertyId() propertyId: string) {
    return this.roomsService.listFloors(propertyId);
  }

  @Post('floors')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async createFloor(
    @CurrentPropertyId() propertyId: string,
    @Body('floorNumber') floorNumber: number,
    @Body('name') name: string
  ) {
    return this.roomsService.createFloor(propertyId, floorNumber, name);
  }

  @Post()
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async createRoom(@CurrentPropertyId() propertyId: string, @Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(propertyId, dto);
  }

  @Put(':id')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async updateRoom(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto
  ) {
    return this.roomsService.updateRoom(propertyId, id, dto);
  }

  @Post('bulk')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async bulkCreateRooms(@CurrentPropertyId() propertyId: string, @Body() dto: BulkCreateRoomsDto) {
    return this.roomsService.bulkCreateRooms(propertyId, dto);
  }
}
