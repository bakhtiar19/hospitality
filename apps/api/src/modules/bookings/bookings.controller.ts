import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto, MoveRoomDto, CancelBookingDto } from './bookings.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { PermissionCode } from '@hospitality/shared-types';

@Controller('bookings')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  async listBookings(
    @CurrentPropertyId() propertyId: string,
    @Query('status') status?: string
  ) {
    return this.bookingsService.listBookings(propertyId, status);
  }

  @Get('tape-chart')
  async getTapeChart(
    @CurrentPropertyId() propertyId: string,
    @Query('start') start: string,
    @Query('end') end: string
  ) {
    return this.bookingsService.getTapeChartGrid(propertyId, start, end);
  }

  @Post()
  @Permissions(PermissionCode.BOOKING_CREATE)
  async createBooking(
    @CurrentPropertyId() propertyId: string,
    @Body() dto: CreateBookingDto
  ) {
    return this.bookingsService.createBooking(propertyId, dto);
  }

  @Put('move')
  @Permissions(PermissionCode.BOOKING_UPDATE)
  async moveRoom(
    @CurrentPropertyId() propertyId: string,
    @Body() dto: MoveRoomDto
  ) {
    return this.bookingsService.moveRoom(propertyId, dto);
  }

  @Post(':id/cancel')
  @Permissions(PermissionCode.BOOKING_CANCEL)
  async cancelBooking(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto
  ) {
    return this.bookingsService.cancelBooking(propertyId, id, dto.reason);
  }
}
