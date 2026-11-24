import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { TaxModule } from '../tax/tax.module.js';
import { WebSocketModule } from '../websocket/websocket.module.js';

@Module({
  imports: [TaxModule, WebSocketModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
