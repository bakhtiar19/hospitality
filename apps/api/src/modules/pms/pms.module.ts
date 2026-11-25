import { Module } from '@nestjs/common';
import { PmsController } from './pms.controller.js';
import { PublicBookingController } from './public-booking.controller.js';
import { PmsService } from './pms.service.js';
import { PmsModulesService } from './pms-modules.service.js';
import { PropertiesModule } from '../properties/properties.module.js';

@Module({
  imports: [PropertiesModule],
  controllers: [PmsController, PublicBookingController],
  providers: [PmsService, PmsModulesService],
  exports: [PmsService, PmsModulesService],
})
export class PmsModule {}
