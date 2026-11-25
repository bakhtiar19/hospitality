import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service.js';
import { AdminPropertiesController, PropertiesController } from './properties.controller.js';
import { PropertyTenantGuard } from './guards/property-tenant.guard.js';

@Module({
  controllers: [PropertiesController, AdminPropertiesController],
  providers: [PropertiesService, PropertyTenantGuard],
  exports: [PropertiesService, PropertyTenantGuard],
})
export class PropertiesModule {}
