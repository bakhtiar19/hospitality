import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service.js';
import { PropertiesController } from './properties.controller.js';
import { PropertyTenantGuard } from './guards/property-tenant.guard.js';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyTenantGuard],
  exports: [PropertiesService, PropertyTenantGuard],
})
export class PropertiesModule {}
