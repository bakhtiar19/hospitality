import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FrontOfficeService } from '../src/modules/front-office/front-office.service.js';
import { BillingService } from '../src/modules/billing/billing.service.js';
import { EventsGateway } from '../src/modules/websocket/events.gateway.js';
import { prisma } from '@hospitality/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FrontOfficeService (Check-in, Check-out, Night Audit)', () => {
  let frontOfficeService: FrontOfficeService;
  let eventsGateway: EventsGateway;

  beforeEach(() => {
    eventsGateway = new EventsGateway();
    frontOfficeService = new FrontOfficeService(eventsGateway);
    vi.clearAllMocks();
  });

  const mockPropertyId = 'prop-winotosastro';

  it('should successfully check in a confirmed reservation, update guest ID, and mark room OCCUPIED', async () => {
    const bookingId = 'bk-checkin-1';
    const roomId = 'room-101';

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: bookingId,
            status: 'CONFIRMED',
            primaryGuestId: 'g-1',
            bookingRooms: [{ id: 'br-1', roomId: null }],
          }),
          update: vi.fn().mockResolvedValue({ id: bookingId, status: 'IN_HOUSE' }),
        },
        room: {
          findUnique: vi.fn().mockResolvedValue({ id: roomId, roomNumber: '101' }),
          update: vi.fn().mockResolvedValue({ id: roomId, operationalStatus: 'OCCUPIED' }),
        },
        guest: { update: vi.fn().mockResolvedValue({}) },
        bookingRoom: { update: vi.fn().mockResolvedValue({}) },
      };
      return cb(mockTx);
    });

    vi.spyOn(eventsGateway, 'broadcastTapeChartUpdate').mockImplementation(() => {});

    const result = await frontOfficeService.checkIn(mockPropertyId, {
      bookingId,
      roomId,
      guestIdType: 'KTP',
      guestIdNumber: '3372010101900001',
    });

    expect(result.booking.status).toBe('IN_HOUSE');
    expect(result.room.roomNumber).toBe('101');
  });

  it('should prevent checkout if folio has an unsettled outstanding balance', async () => {
    const bookingId = 'bk-unsettled-1';

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: bookingId,
            status: 'IN_HOUSE',
            bookingRooms: [{ id: 'br-1', roomId: 'room-101' }],
            folios: [{ id: 'fol-1', balance: BigInt(500000) }], // Unsettled!
          }),
        },
      };
      return cb(mockTx);
    });

    await expect(
      frontOfficeService.checkOut(mockPropertyId, { bookingId, allowUnsettled: false })
    ).rejects.toThrow(BadRequestException);
  });

  it('should complete checkout when folio is settled, mark room DIRTY, and spawn housekeeping task', async () => {
    const bookingId = 'bk-checkout-ok';
    const roomId = 'room-102';

    const roomUpdateSpy = vi.fn().mockResolvedValue({});
    const hkTaskCreateSpy = vi.fn().mockResolvedValue({});

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: bookingId,
            bookingNumber: 'BK-2026-1044',
            status: 'IN_HOUSE',
            bookingRooms: [{ id: 'br-1', roomId }],
            folios: [{ id: 'fol-1', balance: BigInt(0) }], // Settled!
          }),
          update: vi.fn().mockResolvedValue({ id: bookingId, status: 'CHECKED_OUT' }),
        },
        bookingRoom: { update: vi.fn().mockResolvedValue({}) },
        room: { update: roomUpdateSpy },
        housekeepingTask: { create: hkTaskCreateSpy },
      };
      return cb(mockTx);
    });

    vi.spyOn(eventsGateway, 'broadcastTapeChartUpdate').mockImplementation(() => {});

    const result = await frontOfficeService.checkOut(mockPropertyId, { bookingId });

    expect(result.booking.status).toBe('CHECKED_OUT');
    expect(roomUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operationalStatus: 'AVAILABLE',
          housekeepingStatus: 'DIRTY',
          isClean: false,
        }),
      })
    );
    expect(hkTaskCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskType: 'CHECKOUT_CLEAN',
          status: 'PENDING',
        }),
      })
    );
  });
});

describe('BillingService (Charges, Payments, Invoices)', () => {
  let billingService: BillingService;

  beforeEach(() => {
    billingService = new BillingService();
    vi.clearAllMocks();
  });

  it('should post extra charges and adjust folio totalCharges and balance', async () => {
    const mockPropertyId = 'prop-winotosastro';
    const folioId = 'fol-charge-test';

    vi.spyOn(prisma.folio, 'findFirst').mockResolvedValue({
      id: folioId,
      propertyId: mockPropertyId,
      totalCharges: BigInt(1000000),
      balance: BigInt(1000000),
    } as any);

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        folioTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'ft-1',
            category: 'FNB',
            amount: BigInt(150000),
          }),
        },
        folio: {
          update: vi.fn().mockResolvedValue({
            id: folioId,
            totalCharges: BigInt(1150000),
            balance: BigInt(1150000),
          }),
        },
      };
      return cb(mockTx);
    });

    const result = await billingService.postCharge(
      mockPropertyId,
      folioId,
      {
        category: 'FNB',
        amount: 150000,
        description: 'Room Service Dinner (Nasi Liwet Solo)',
      },
      'user-1'
    );

    expect(result.folio.balance).toBe(BigInt(1150000));
    expect(result.transaction.amount).toBe(BigInt(150000));
  });

  it('should record payments (QRIS/Card/Cash) and update booking payment status to PAID when balance is 0', async () => {
    const mockPropertyId = 'prop-winotosastro';
    const folioId = 'fol-pay-test';

    vi.spyOn(prisma.folio, 'findFirst').mockResolvedValue({
      id: folioId,
      propertyId: mockPropertyId,
      bookingId: 'bk-pay-1',
      totalCharges: BigInt(1000000),
      balance: BigInt(1000000),
      booking: { id: 'bk-pay-1' },
    } as any);

    const bookingUpdateSpy = vi.fn().mockResolvedValue({});

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        payment: {
          create: vi.fn().mockResolvedValue({
            id: 'pay-1',
            paymentMethod: 'QRIS',
            amount: BigInt(1000000),
            status: 'SUCCESS',
          }),
        },
        folioTransaction: { create: vi.fn().mockResolvedValue({}) },
        folio: {
          update: vi.fn().mockResolvedValue({
            id: folioId,
            totalPayments: BigInt(1000000),
            balance: BigInt(0), // Fully settled
          }),
        },
        booking: { update: bookingUpdateSpy },
      };
      return cb(mockTx);
    });

    const result = await billingService.recordPayment(
      mockPropertyId,
      folioId,
      {
        amount: 1000000,
        paymentMethod: 'QRIS',
        gateway: 'MIDTRANS',
        gatewayTransactionId: 'midtrans-qris-8821',
      },
      'user-1'
    );

    expect(result.folio.balance).toBe(BigInt(0));
    expect(bookingUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: 'PAID',
        }),
      })
    );
  });
});
