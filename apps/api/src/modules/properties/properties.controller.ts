import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PropertiesService } from './properties.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentPropertyId } from './decorators/current-property.decorator.js';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async listProperties() {
    return this.propertiesService.listProperties();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentProperty(@CurrentPropertyId() propertyId: string) {
    return this.propertiesService.getProperty(propertyId);
  }

  @Get(':idOrCode')
  async getProperty(@Param('idOrCode') idOrCode: string) {
    return this.propertiesService.getProperty(idOrCode);
  }
}
