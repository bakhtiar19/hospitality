import { Module } from '@nestjs/common';
import { ChannelManagerController } from './channel-manager.controller.js';
import { ChannelManagerService } from './channel-manager.service.js';
import { AgodaAdapter } from './adapters/agoda.adapter.js';
import { BookingsModule } from '../bookings/bookings.module.js';

@Module({
  imports: [BookingsModule],
  controllers: [ChannelManagerController],
  providers: [ChannelManagerService, AgodaAdapter],
  exports: [ChannelManagerService, AgodaAdapter],
})
export class ChannelManagerModule {}
