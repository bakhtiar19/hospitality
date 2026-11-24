import { Module } from '@nestjs/common';
import { FrontOfficeService } from './front-office.service.js';
import { FrontOfficeController } from './front-office.controller.js';
import { WebSocketModule } from '../websocket/websocket.module.js';

@Module({
  imports: [WebSocketModule],
  controllers: [FrontOfficeController],
  providers: [FrontOfficeService],
  exports: [FrontOfficeService],
})
export class FrontOfficeModule {}
