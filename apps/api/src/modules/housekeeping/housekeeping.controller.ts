import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HousekeepingService, UpdateRoomCleanlinessDto } from './housekeeping.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { PermissionCode } from '@hospitality/shared-types';

@Controller('housekeeping')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Get('board')
  async getBoard(@CurrentPropertyId() propertyId: string) {
    return this.housekeepingService.getBoard(propertyId);
  }

  @Put('rooms/:id/status')
  @Permissions(PermissionCode.HOUSEKEEPING_UPDATE)
  async updateRoomStatus(
    @CurrentPropertyId() propertyId: string,
    @Param('id') roomId: string,
    @Body() dto: UpdateRoomCleanlinessDto
  ) {
    return this.housekeepingService.updateRoomStatus(propertyId, roomId, dto);
  }

  @Get('tasks')
  async getTasks(
    @CurrentPropertyId() propertyId: string,
    @Query('assignedTo') assignedTo?: string
  ) {
    return this.housekeepingService.getTasks(propertyId, assignedTo);
  }

  @Post('tasks/:id/complete')
  @Permissions(PermissionCode.HOUSEKEEPING_UPDATE)
  async completeTask(
    @CurrentPropertyId() propertyId: string,
    @Param('id') taskId: string
  ) {
    return this.housekeepingService.completeTask(propertyId, taskId);
  }
}
