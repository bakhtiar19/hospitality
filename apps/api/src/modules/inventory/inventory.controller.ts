import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { LedgerConsistencyService } from './ledger-consistency.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@hospitality/shared-types';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PropertyTenantGuard)
export class InventoryController {
  constructor(private readonly consistencyService: LedgerConsistencyService) {}

  @Post('reconcile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async triggerReconciliation(
    @CurrentPropertyId() propertyId: string,
    @Body('startDate') startDate?: string,
    @Body('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.consistencyService.runReconciliation(propertyId, start, end);
  }
}
