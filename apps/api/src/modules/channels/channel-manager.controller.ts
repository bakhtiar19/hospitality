import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ChannelManagerService, SaveChannelMappingDto } from './channel-manager.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';

@Controller('channels')
@UseGuards(JwtAuthGuard, RolesGuard, PropertyTenantGuard)
export class ChannelManagerController {
  constructor(private readonly channelManagerService: ChannelManagerService) {}

  @Get('health')
  async getHealth(@CurrentPropertyId() propertyId: string) {
    return this.channelManagerService.getHealth(propertyId);
  }

  @Get('mappings')
  async getMappings(
    @CurrentPropertyId() propertyId: string,
    @Query('channelCode') channelCode?: string,
  ) {
    return this.channelManagerService.getMappings(propertyId, channelCode);
  }

  @Post('mappings')
  async saveMappings(
    @CurrentPropertyId() propertyId: string,
    @Body() dto: SaveChannelMappingDto,
  ) {
    return this.channelManagerService.saveMappings(propertyId, dto);
  }

  @Post('push-ari')
  async pushAri(
    @CurrentPropertyId() propertyId: string,
    @Body() body: { channelCode?: string; dateFrom?: string; dateTo?: string },
  ) {
    const availResult = await this.channelManagerService.pushAvailability(
      propertyId,
      body.channelCode,
      body.dateFrom,
      body.dateTo,
    );
    const ratesResult = await this.channelManagerService.pushRates(
      propertyId,
      body.channelCode,
      body.dateFrom,
    );
    const restrictionsResult = await this.channelManagerService.pushRestrictions(
      propertyId,
      body.channelCode,
      body.dateFrom,
    );

    return {
      availability: availResult,
      rates: ratesResult,
      restrictions: restrictionsResult,
    };
  }

  @Post('sync-reservations')
  async syncReservations(
    @CurrentPropertyId() propertyId: string,
    @Body() body: { channelCode?: string },
  ) {
    return this.channelManagerService.syncReservations(propertyId, body.channelCode);
  }

  @Get('sync-logs')
  async getSyncLogs(
    @CurrentPropertyId() propertyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.channelManagerService.getSyncLogs(propertyId, limit ? parseInt(limit, 10) : 20);
  }

  @Post('retry/:logId')
  async retrySyncLog(@Param('logId') logId: string) {
    return this.channelManagerService.retrySyncLog(logId);
  }

  @Post('simulate-booking')
  async simulateBooking(@Body() body: any) {
    const mockUrl = process.env.AGODA_MOCK_URL || 'http://localhost:4001';
    const response = await fetch(`${mockUrl}/agoda/simulate/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return response.json();
  }

  @Post('simulate-error')
  async simulateError(@Body() body: { mode: string }) {
    const mockUrl = process.env.AGODA_MOCK_URL || 'http://localhost:4001';
    const response = await fetch(`${mockUrl}/agoda/simulate/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  }
}
