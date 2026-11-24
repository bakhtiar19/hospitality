import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TaxService, CreateTaxDto, UpdateTaxDto } from './tax.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PropertyTenantGuard } from '../properties/guards/property-tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentPropertyId } from '../properties/decorators/current-property.decorator.js';
import { PermissionCode } from '@hospitality/shared-types';

@Controller('taxes')
@UseGuards(JwtAuthGuard, PropertyTenantGuard, RolesGuard, PermissionsGuard)
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  async getTaxes(@CurrentPropertyId() propertyId: string) {
    return this.taxService.getTaxes(propertyId);
  }

  @Post()
  @Permissions(PermissionCode.TAX_MANAGE)
  async createTax(@CurrentPropertyId() propertyId: string, @Body() dto: CreateTaxDto) {
    return this.taxService.createTax(propertyId, dto);
  }

  @Put(':id')
  @Permissions(PermissionCode.TAX_MANAGE)
  async updateTax(
    @CurrentPropertyId() propertyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxDto
  ) {
    return this.taxService.updateTax(propertyId, id, dto);
  }

  @Delete(':id')
  @Permissions(PermissionCode.TAX_MANAGE)
  async deleteTax(@CurrentPropertyId() propertyId: string, @Param('id') id: string) {
    return this.taxService.deleteTax(propertyId, id);
  }

  @Post('calculate')
  async calculateTax(
    @CurrentPropertyId() propertyId: string,
    @Body('amount') amount: number | string,
    @Body('ratePlanId') ratePlanId?: string,
    @Body('currency') currency?: string
  ) {
    const parsedAmount = BigInt(amount);
    return this.taxService.calculateTaxes(propertyId, parsedAmount, ratePlanId, currency || 'IDR');
  }
}
