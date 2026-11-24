import { Module } from '@nestjs/common';
import { HousekeepingService } from './housekeeping.service.js';
import { HousekeepingController } from './housekeeping.controller.js';
import { WebSocketModule } from '../websocket/websocket.module.js';

@Module({
  imports: [WebSocketModule],
  controllers: [HousekeepingController],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
