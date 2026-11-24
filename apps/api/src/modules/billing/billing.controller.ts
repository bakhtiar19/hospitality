import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BillingService, PostChargeDto, RecordPaymentDto } from './billing.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PermissionCode, UserPayload } from '@hospitality/shared-types';

@Controller('billing')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('folios/:id')
  async getFolio(@CurrentPropertyId() propertyId: string, @Param('id') folioId: string) {
    return this.billingService.getFolio(propertyId, folioId);
  }

  @Post('folios/:id/charges')
  @Permissions(PermissionCode.FOLIO_CHARGE)
  async postCharge(
    @CurrentPropertyId() propertyId: string,
    @Param('id') folioId: string,
    @Body() dto: PostChargeDto,
    @CurrentUser() user: UserPayload
  ) {
    return this.billingService.postCharge(propertyId, folioId, dto, user.sub);
  }

  @Post('folios/:id/payments')
  @Permissions(PermissionCode.FOLIO_PAYMENT)
  async recordPayment(
    @CurrentPropertyId() propertyId: string,
    @Param('id') folioId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: UserPayload
  ) {
    return this.billingService.recordPayment(propertyId, folioId, dto, user.sub);
  }

  @Get('folios/:id/invoice')
  async getInvoice(@CurrentPropertyId() propertyId: string, @Param('id') folioId: string) {
    return this.billingService.generateInvoice(propertyId, folioId);
  }
}
