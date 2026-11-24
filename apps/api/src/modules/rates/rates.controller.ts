import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RatesService, CreateRatePlanDto, UpdateRatePlanDto } from './rates.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { PermissionCode } from '@hospitality/shared-types';

@Controller('rates')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get('plans')
  async listRatePlans(@CurrentPropertyId() propertyId: string) {
    return this.ratesService.listRatePlans(propertyId);
  }

  @Post('plans')
  @Permissions(PermissionCode.RATES_UPDATE)
  async createRatePlan(@CurrentPropertyId() propertyId: string, @Body() dto: CreateRatePlanDto) {
    return this.ratesService.createRatePlan(propertyId, dto);
  }

  @Put('plans/:id')
  @Permissions(PermissionCode.RATES_UPDATE)
  async updateRatePlan(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRatePlanDto
  ) {
    return this.ratesService.updateRatePlan(propertyId, id, dto);
  }

  @Post('plans/:id/prices')
  @Permissions(PermissionCode.RATES_UPDATE)
  async setRoomBasePrice(
    @CurrentPropertyId() propertyId: string,
    @Param('id') ratePlanId: string,
    @Body('roomTypeId') roomTypeId: string,
    @Body('basePrice') basePrice: number | string,
    @Body('currency') currency?: string
  ) {
    return this.ratesService.setRoomBasePrice(
      propertyId,
      ratePlanId,
      roomTypeId,
      BigInt(basePrice),
      currency || 'IDR'
    );
  }

  @Get('matrix')
  async getRateMatrix(
    @CurrentPropertyId() propertyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.ratesService.getRateMatrix(propertyId, startDate, endDate);
  }
}
