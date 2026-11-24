import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CrmService, MergeGuestsDto } from './crm.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard, PropertyTenantGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('guests')
  async getGuests(
    @CurrentPropertyId() propertyId: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
  ) {
    const list = await this.crmService.getGuests(propertyId, search, tag);
    return JSON.parse(
      JSON.stringify(list, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  @Get('guests/:id')
  async getGuestProfile(
    @CurrentPropertyId() propertyId: string,
    @Param('id') guestId: string,
  ) {
    const profile = await this.crmService.getGuestProfile(propertyId, guestId);
    return JSON.parse(
      JSON.stringify(profile, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  @Put('guests/:id')
  async updateGuest(
    @CurrentPropertyId() propertyId: string,
    @Param('id') guestId: string,
    @Body() dto: any,
  ) {
    const updated = await this.crmService.updateGuest(propertyId, guestId, dto);
    return JSON.parse(
      JSON.stringify(updated, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  @Post('guests/merge')
  async mergeGuests(
    @CurrentPropertyId() propertyId: string,
    @Body() dto: MergeGuestsDto,
  ) {
    const result = await this.crmService.mergeGuests(propertyId, dto);
    return JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}
