import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FrontOfficeService, CheckInDto, CheckOutDto } from './front-office.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PermissionCode, UserPayload } from '@hospitality/shared-types';

@Controller('front-office')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class FrontOfficeController {
  constructor(private readonly frontOfficeService: FrontOfficeService) {}

  @Get('arrivals')
  async getArrivals(
    @CurrentPropertyId() propertyId: string,
    @Query('date') date?: string
  ) {
    return this.frontOfficeService.getArrivals(propertyId, date);
  }

  @Get('departures')
  async getDepartures(
    @CurrentPropertyId() propertyId: string,
    @Query('date') date?: string
  ) {
    return this.frontOfficeService.getDepartures(propertyId, date);
  }

  @Get('in-house')
  async getInHouse(@CurrentPropertyId() propertyId: string) {
    return this.frontOfficeService.getInHouse(propertyId);
  }

  @Post('check-in')
  @Permissions(PermissionCode.FRONT_DESK_CHECKIN)
  async checkIn(@CurrentPropertyId() propertyId: string, @Body() dto: CheckInDto) {
    return this.frontOfficeService.checkIn(propertyId, dto);
  }

  @Post('check-out')
  @Permissions(PermissionCode.FRONT_DESK_CHECKOUT)
  async checkOut(@CurrentPropertyId() propertyId: string, @Body() dto: CheckOutDto) {
    return this.frontOfficeService.checkOut(propertyId, dto);
  }

  @Post('night-audit')
  @Permissions(PermissionCode.NIGHT_AUDIT_EXECUTE)
  async executeNightAudit(
    @CurrentPropertyId() propertyId: string,
    @CurrentUser() user: UserPayload
  ) {
    return this.frontOfficeService.executeNightAudit(propertyId, user.sub);
  }
}
