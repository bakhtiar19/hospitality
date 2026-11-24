import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PropertyTenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @CurrentPropertyId() propertyId: string,
    @Query('businessDate') businessDate?: string,
  ) {
    const activePropertyId = propertyId || 'prop-winotosastro';
    const summary = await this.dashboardService.getSummary(activePropertyId, businessDate);
    
    // Convert BigInt to string for JSON serialization
    return JSON.parse(
      JSON.stringify(summary, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}
