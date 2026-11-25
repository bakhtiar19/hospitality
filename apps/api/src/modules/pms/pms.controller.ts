import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PmsService } from './pms.service.js';
import { PmsModulesService } from './pms-modules.service.js';
import {
  CheckOutPmsDto,
  CreatePmsBookingDto,
  ExtendPmsStayDto,
  RecordPmsPaymentDto,
  SettleOtaBatchDto,
  UpdatePmsSettingsDto,
} from './pms.dto.js';
import {
  CreateGuestCrmDto,
  CreateRatePlanDto,
  CreateRoomUnitDto,
  MergeGuestsDto,
  TriggerChannelSyncDto,
  UpdateGuestCrmDto,
  UpdateHousekeepingRoomDto,
  UpdateRatePriceDto,
  UpsertRoomTypeDto,
} from './pms-modules.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PermissionCode, UserPayload } from '@hospitality/shared-types';

@Controller('pms')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class PmsController {
  constructor(
    private readonly pmsService: PmsService,
    private readonly pmsModules: PmsModulesService
  ) {}

  @Get('bootstrap')
  async getBootstrap(@CurrentPropertyId() propertyId: string) {
    return this.pmsService.getBootstrap(propertyId);
  }

  @Get('analytics')
  async getAnalytics(@CurrentPropertyId() propertyId: string) {
    return this.pmsModules.getDashboardAnalytics(propertyId);
  }

  // Bookings & Front Office
  @Post('bookings')
  @Permissions(PermissionCode.BOOKING_CREATE)
  async createBooking(
    @CurrentPropertyId() propertyId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreatePmsBookingDto
  ) {
    return this.pmsService.createBooking(propertyId, dto, user.sub);
  }

  @Post('bookings/:id/check-in')
  @Permissions(PermissionCode.FRONT_DESK_CHECKIN)
  async checkIn(@CurrentPropertyId() propertyId: string, @Param('id') id: string) {
    return this.pmsService.checkIn(propertyId, id);
  }

  @Post('bookings/:id/check-out')
  @Permissions(PermissionCode.FRONT_DESK_CHECKOUT)
  async checkOut(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: CheckOutPmsDto
  ) {
    return this.pmsService.checkOut(propertyId, id, dto);
  }

  @Post('bookings/:id/extend')
  @Permissions(PermissionCode.BOOKING_UPDATE)
  async extendStay(
    @CurrentPropertyId() propertyId: string,
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: ExtendPmsStayDto
  ) {
    return this.pmsService.extendStay(propertyId, id, dto, user.sub);
  }

  @Post('bookings/:id/payments')
  @Permissions(PermissionCode.FOLIO_PAYMENT)
  async recordPayment(
    @CurrentPropertyId() propertyId: string,
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: RecordPmsPaymentDto
  ) {
    return this.pmsService.recordPayment(propertyId, id, dto, user.sub);
  }

  @Delete('bookings/:id')
  @Permissions(PermissionCode.BOOKING_CANCEL)
  async deleteBooking(@CurrentPropertyId() propertyId: string, @Param('id') id: string) {
    return this.pmsService.deleteBooking(propertyId, id);
  }

  // Finance & Settings
  @Post('finance/settlements/settle')
  @Permissions(PermissionCode.FOLIO_PAYMENT)
  async settleOta(@CurrentPropertyId() propertyId: string, @Body() dto: SettleOtaBatchDto) {
    return this.pmsService.settleOtaTransactions(propertyId, dto);
  }

  @Put('settings')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async updateSettings(@CurrentPropertyId() propertyId: string, @Body() dto: UpdatePmsSettingsDto) {
    return this.pmsService.updateSettings(propertyId, dto);
  }

  // Room Types & Physical Rooms CRUD
  @Get('room-setup')
  async listRoomSetup(@CurrentPropertyId() propertyId: string) {
    return this.pmsModules.listRoomSetup(propertyId);
  }

  @Post('room-types')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async createRoomType(@CurrentPropertyId() propertyId: string, @Body() dto: UpsertRoomTypeDto) {
    return this.pmsModules.createRoomType(propertyId, dto);
  }

  @Put('room-types/:id')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async updateRoomType(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertRoomTypeDto>
  ) {
    return this.pmsModules.updateRoomType(propertyId, id, dto);
  }

  @Post('rooms')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async createRoomUnit(@CurrentPropertyId() propertyId: string, @Body() dto: CreateRoomUnitDto) {
    return this.pmsModules.createRoomUnit(propertyId, dto);
  }

  @Delete('rooms/:id')
  @Permissions(PermissionCode.PROPERTY_UPDATE)
  async deleteRoomUnit(@CurrentPropertyId() propertyId: string, @Param('id') id: string) {
    return this.pmsModules.deleteRoomUnit(propertyId, id);
  }

  // Housekeeping
  @Get('housekeeping')
  async listHousekeeping(@CurrentPropertyId() propertyId: string) {
    return this.pmsModules.listHousekeepingRooms(propertyId);
  }

  @Patch('housekeeping/rooms/:id')
  @Permissions(PermissionCode.HOUSEKEEPING_UPDATE)
  async updateHousekeepingRoom(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHousekeepingRoomDto
  ) {
    return this.pmsModules.updateHousekeepingRoom(propertyId, id, dto);
  }

  // Guest CRM
  @Get('guests')
  async listGuests(@CurrentPropertyId() propertyId: string) {
    return this.pmsModules.listGuestsCrm(propertyId);
  }

  @Post('guests')
  @Permissions(PermissionCode.BOOKING_CREATE)
  async createGuest(@CurrentPropertyId() propertyId: string, @Body() dto: CreateGuestCrmDto) {
    return this.pmsModules.createGuestCrm(propertyId, dto);
  }

  @Patch('guests/:id')
  @Permissions(PermissionCode.BOOKING_UPDATE)
  async updateGuest(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGuestCrmDto
  ) {
    return this.pmsModules.updateGuestCrm(propertyId, id, dto);
  }

  @Post('guests/merge')
  @Permissions(PermissionCode.BOOKING_UPDATE)
  async mergeGuests(@CurrentPropertyId() propertyId: string, @Body() dto: MergeGuestsDto) {
    return this.pmsModules.mergeGuestsCrm(propertyId, dto);
  }

  // Rates & Rate Plans
  @Get('rates')
  async getRatesMatrix(@CurrentPropertyId() propertyId: string) {
    return this.pmsModules.getRatesMatrix(propertyId);
  }

  @Put('rates/price')
  @Permissions(PermissionCode.RATES_UPDATE)
  async updateRatePrice(@CurrentPropertyId() propertyId: string, @Body() dto: UpdateRatePriceDto) {
    return this.pmsModules.updateRatePrice(propertyId, dto);
  }

  @Post('rates/plans')
  @Permissions(PermissionCode.RATES_UPDATE)
  async createRatePlan(@CurrentPropertyId() propertyId: string, @Body() dto: CreateRatePlanDto) {
    return this.pmsModules.createRatePlan(propertyId, dto);
  }

  // Channel Manager
  @Get('channels')
  async getChannels(@CurrentPropertyId() propertyId: string) {
    return this.pmsModules.getChannelsOverview(propertyId);
  }

  @Post('channels/sync')
  @Permissions(PermissionCode.CHANNEL_SYNC)
  async triggerChannelSync(
    @CurrentPropertyId() propertyId: string,
    @Body() dto: TriggerChannelSyncDto
  ) {
    return this.pmsModules.triggerChannelSync(propertyId, dto);
  }
}
