import { Module } from '@nestjs/common';
import { LedgerConsistencyService } from './ledger-consistency.service.js';
import { InventoryController } from './inventory.controller.js';

@Module({
  controllers: [InventoryController],
  providers: [LedgerConsistencyService],
  exports: [LedgerConsistencyService],
})
export class InventoryModule {}
