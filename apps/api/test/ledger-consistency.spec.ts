import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LedgerConsistencyService } from '../src/modules/inventory/ledger-consistency.service.js';
import { prisma } from '@hospitality/database';

describe('LedgerConsistencyService (Inventory Reconciliation & Self-Healing)', () => {
  let service: LedgerConsistencyService;

  beforeEach(() => {
    service = new LedgerConsistencyService();
    vi.clearAllMocks();
  });

  it('should detect drift and self-heal inventory_ledger when count diverges from booking_rooms', async () => {
    const mockPropertyId = 'prop-winotosastro';
    const mockDate = new Date('2026-11-25');

    // Mock inventory ledger row with an incorrect count (e.g. bookedCount=3 instead of 5)
    vi.spyOn(prisma.inventoryLedger, 'findMany').mockResolvedValue([
      {
        id: 'ledger-1',
        propertyId: mockPropertyId,
        roomTypeId: 'rt-dlx',
        date: mockDate,
        totalInventory: 15,
        bookedCount: 3, // Drift!
        oooCount: 1,
        availableCount: 11,
        lockVersion: 1,
        updatedAt: new Date(),
      },
    ]);

    // Mock actual active booking_rooms count = 5
    vi.spyOn(prisma.bookingRoom, 'count').mockResolvedValue(5);

    const updateSpy = vi.spyOn(prisma.inventoryLedger, 'update').mockResolvedValue({} as any);
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

    const result = await service.runReconciliation(mockPropertyId, mockDate, mockDate);

    // Verify detection
    expect(result.anomaliesDetected).toBe(1);
    expect(result.anomaliesFixed).toBe(1);
    expect(result.details[0].drift).toBe(2); // 5 - 3 = 2
    expect(result.details[0].actualBooked).toBe(5);

    // Verify self-healing update
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'ledger-1' },
      data: {
        bookedCount: 5,
        availableCount: 9, // 15 - 1 - 5 = 9
        lockVersion: { increment: 1 },
      },
    });

    // Verify audit record creation
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          propertyId: mockPropertyId,
          action: 'INVENTORY_LEDGER_RECONCILE',
          entityType: 'INVENTORY_LEDGER',
          entityId: 'ledger-1',
        }),
      })
    );
  });

  it('should report zero anomalies when inventory ledger is perfectly synchronized', async () => {
    const mockPropertyId = 'prop-winotosastro';
    const mockDate = new Date('2026-11-25');

    vi.spyOn(prisma.inventoryLedger, 'findMany').mockResolvedValue([
      {
        id: 'ledger-2',
        propertyId: mockPropertyId,
        roomTypeId: 'rt-sup',
        date: mockDate,
        totalInventory: 15,
        bookedCount: 4,
        oooCount: 0,
        availableCount: 11,
        lockVersion: 1,
        updatedAt: new Date(),
      },
    ]);

    vi.spyOn(prisma.bookingRoom, 'count').mockResolvedValue(4); // Perfectly matches!

    const updateSpy = vi.spyOn(prisma.inventoryLedger, 'update');
    const result = await service.runReconciliation(mockPropertyId, mockDate, mockDate);

    expect(result.anomaliesDetected).toBe(0);
    expect(result.anomaliesFixed).toBe(0);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
