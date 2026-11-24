import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@hospitality/database';

export interface ConsistencyCheckResult {
  propertyId: string;
  checkedDates: number;
  anomaliesDetected: number;
  anomaliesFixed: number;
  details: Array<{
    roomTypeId: string;
    date: string;
    ledgerBooked: number;
    actualBooked: number;
    drift: number;
    fixed: boolean;
  }>;
}

@Injectable()
export class LedgerConsistencyService {
  private readonly logger = new Logger(LedgerConsistencyService.name);

  /**
   * Reconciles inventory_ledger against actual active booking_rooms (assigned and unassigned).
   * Automatically heals any detected drift and records audit anomalies.
   */
  async runReconciliation(
    propertyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConsistencyCheckResult> {
    const start = startDate || new Date();
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    this.logger.log(
      `Running inventory ledger consistency check for property ${propertyId} [${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}]`
    );

    // 1. Fetch all inventory ledger entries for this property in range
    const ledgers = await prisma.inventoryLedger.findMany({
      where: {
        propertyId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const result: ConsistencyCheckResult = {
      propertyId,
      checkedDates: ledgers.length,
      anomaliesDetected: 0,
      anomaliesFixed: 0,
      details: [],
    };

    // 2. For each ledger entry, count actual active reservations
    for (const ledger of ledgers) {
      const actualBooked = await prisma.bookingRoom.count({
        where: {
          roomTypeId: ledger.roomTypeId,
          roomStatus: {
            in: ['CONFIRMED', 'CHECKED_IN', 'IN_HOUSE'],
          },
          checkInDate: {
            lte: ledger.date,
          },
          checkOutDate: {
            gt: ledger.date, // Stay date is active up to checkOutDate (exclusive)
          },
        },
      });

      if (ledger.bookedCount !== actualBooked) {
        const drift = actualBooked - ledger.bookedCount;
        result.anomaliesDetected++;

        this.logger.warn(
          `Inventory drift detected for roomType ${ledger.roomTypeId} on ${ledger.date.toISOString().split('T')[0]}: ledger=${ledger.bookedCount}, actual=${actualBooked} (drift=${drift})`
        );

        // Self-heal: update inventory ledger to match actual reservations
        const correctedAvailable = Math.max(
          0,
          ledger.totalInventory - ledger.oooCount - actualBooked
        );

        await prisma.inventoryLedger.update({
          where: { id: ledger.id },
          data: {
            bookedCount: actualBooked,
            availableCount: correctedAvailable,
            lockVersion: { increment: 1 },
          },
        });

        // Record audit anomaly
        await prisma.auditLog.create({
          data: {
            propertyId,
            action: 'INVENTORY_LEDGER_RECONCILE',
            entityType: 'INVENTORY_LEDGER',
            entityId: ledger.id,
            oldValues: {
              bookedCount: ledger.bookedCount,
              availableCount: ledger.availableCount,
            },
            newValues: {
              bookedCount: actualBooked,
              availableCount: correctedAvailable,
              drift,
            },
          },
        });

        result.anomaliesFixed++;
        result.details.push({
          roomTypeId: ledger.roomTypeId,
          date: ledger.date.toISOString().split('T')[0],
          ledgerBooked: ledger.bookedCount,
          actualBooked,
          drift,
          fixed: true,
        });
      }
    }

    this.logger.log(
      `Reconciliation completed for property ${propertyId}. ${result.anomaliesDetected} anomalies detected, ${result.anomaliesFixed} self-healed.`
    );

    return result;
  }
}
