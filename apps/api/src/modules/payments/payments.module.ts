import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { MidtransAdapter } from './adapters/midtrans.adapter.js';
import { WebSocketModule } from '../websocket/websocket.module.js';

@Module({
  imports: [WebSocketModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MidtransAdapter],
  exports: [PaymentsService, MidtransAdapter],
})
export class PaymentsModule {}
