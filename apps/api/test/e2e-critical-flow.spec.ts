import { describe, it, expect, vi } from 'vitest';
import { FrontOfficeService } from '../src/modules/front-office/front-office.service.js';
import { BillingService } from '../src/modules/billing/billing.service.js';
import { HousekeepingService } from '../src/modules/housekeeping/housekeeping.service.js';
import { EventsGateway } from '../src/modules/websocket/events.gateway.js';
import { AgodaPayloadMapper } from '../src/modules/channels/mappers/agoda-payload.mapper.js';
import { MidtransAdapter } from '../src/modules/payments/adapters/midtrans.adapter.js';
import { prisma } from '@hospitality/database';
import { BadRequestException } from '@nestjs/common';

describe('E2E Critical Hotel Operations Lifecycle', () => {
  const propertyId = 'prop-winotosastro';
  const eventsGateway = new EventsGateway();
  const frontOfficeService = new FrontOfficeService(eventsGateway);
  const billingService = new BillingService();
  const housekeepingService = new HousekeepingService(eventsGateway);
  const paymentAdapter = new MidtransAdapter();

  it('should execute complete operational guest journey: Intake -> Check-In -> Charges -> QRIS Payment -> Check-Out -> Housekeeping', async () => {
    // 1. INTAKE: Inbound Agoda Reservation
    const inboundOta = {
      channelReservationId: 'AGD-E2E-991',
      hotelId: 'HOTEL-WINOTOSASTRO-AGD',
      roomTypeCode: 'AGD-RT-DLX',
      ratePlanCode: 'AGD-RP-BB',
      guest: {
        firstName: 'Surya',
        lastName: 'Kusuma',
        email: 'surya.kusuma@example.id',
        phone: '+6281122334455',
        nationality: 'ID',
      },
      stay: {
        checkInDate: '2026-11-26',
        checkOutDate: '2026-11-28',
        nights: 2,
        adults: 2,
        children: 0,
      },
      pricing: {
        currency: 'IDR',
        totalAmount: 1760000,
      },
      status: 'CONFIRMED',
      action: 'NEW_BOOKING',
    };

    const parsedReservation = AgodaPayloadMapper.fromAgodaReservation(inboundOta);
    expect(parsedReservation.channelReservationId).toBe('AGD-E2E-991');
    expect(parsedReservation.pricing.totalAmount).toBe(1760000);

    const bookingId = 'bk-e2e-surya';
    const roomId = 'room-201';
    const folioId = 'fol-e2e-surya';

    // 2. CHECK-IN WIZARD: Guest arrives at front desk, documents KTP, assigns Room 201
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: bookingId,
            status: 'CONFIRMED',
            primaryGuestId: 'g-e2e',
            bookingRooms: [{ id: 'br-e2e', roomId: null }],
          }),
          update: vi.fn().mockResolvedValue({ id: bookingId, status: 'IN_HOUSE' }),
        },
        room: {
          findUnique: vi.fn().mockResolvedValue({ id: roomId, roomNumber: '201' }),
          update: vi.fn().mockResolvedValue({ id: roomId, operationalStatus: 'OCCUPIED' }),
        },
        guest: { update: vi.fn().mockResolvedValue({}) },
        bookingRoom: { update: vi.fn().mockResolvedValue({}) },
      };
      return cb(mockTx);
    });

    vi.spyOn(eventsGateway, 'broadcastTapeChartUpdate').mockImplementation(() => {});

    const checkInResult = await frontOfficeService.checkIn(propertyId, {
      bookingId,
      roomId,
      guestIdType: 'KTP',
      guestIdNumber: '3372012304950003',
    });

    expect(checkInResult.booking.status).toBe('IN_HOUSE');
    expect(checkInResult.room.roomNumber).toBe('201');

    // 3. CHARGES: Guest orders Laundry & Minibar during stay
    vi.spyOn(prisma.folio, 'findFirst').mockResolvedValue({
      id: folioId,
      propertyId,
      totalCharges: BigInt(1760000),
      balance: BigInt(200000),
    } as any);

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        folioTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'ft-1',
            category: 'LAUNDRY',
            amount: BigInt(200000),
          }),
        },
        folio: {
          update: vi.fn().mockResolvedValue({
            id: folioId,
            totalCharges: BigInt(1960000),
            balance: BigInt(200000),
          }),
        },
      };
      return cb(mockTx);
    });

    const chargeResult = await billingService.postCharge(
      propertyId,
      folioId,
      {
        category: 'LAUNDRY',
        amount: 200000,
        description: 'Express Laundry (Batik Shirts)',
      },
      'staff-frontdesk-1',
    );

    expect(chargeResult.transaction.amount).toBe(BigInt(200000));

    // 4. CHECK-OUT ATTEMPT WHILE UNSETTLED (Must be blocked!)
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: bookingId,
            status: 'IN_HOUSE',
            bookingRooms: [{ id: 'br-e2e', roomId }],
            folios: [{ id: folioId, balance: BigInt(200000) }], // Unsettled!
          }),
        },
      };
      return cb(mockTx);
    });

    await expect(
      frontOfficeService.checkOut(propertyId, { bookingId, allowUnsettled: false }),
    ).rejects.toThrow(BadRequestException);

    // 5. PAYMENT SETTLEMENT: Guest pays via QRIS
    const qrisCharge = await paymentAdapter.createCharge({
      orderId: 'BK-E2E-SURYA',
      propertyId,
      amount: BigInt(200000),
      currency: 'IDR',
      paymentMethod: 'QRIS',
      customerDetails: {
        firstName: 'Surya',
        email: 'surya.kusuma@example.id',
      },
    });

    expect(qrisCharge.status).toBe('PENDING');
    expect(qrisCharge.qrisString).toBeDefined();

    // Record settlement in folio
    vi.spyOn(prisma.folio, 'findFirst').mockResolvedValue({
      id: folioId,
      bookingId,
      propertyId,
      totalPayments: BigInt(0),
      balance: BigInt(200000),
    } as any);

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        payment: {
          create: vi.fn().mockResolvedValue({
            id: 'pmt-1',
            amount: BigInt(200000),
            paymentMethod: 'QRIS',
          }),
        },
        folioTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'ft-pmt-1',
            amount: BigInt(200000),
          }),
        },
        folio: {
          update: vi.fn().mockResolvedValue({
            id: folioId,
            totalPayments: BigInt(200000),
            balance: BigInt(0), // Settled!
          }),
        },
        booking: {
          update: vi.fn().mockResolvedValue({
            id: bookingId,
            paymentStatus: 'PAID',
          }),
        },
      };
      return cb(mockTx);
    });

    const paymentResult = await billingService.recordPayment(
      propertyId,
      folioId,
      {
        paymentMethod: 'QRIS',
        amount: 200000,
        reference: qrisCharge.transactionId,
      },
      'staff-frontdesk-1',
    );

    expect(paymentResult.payment.amount).toBe(BigInt(200000));
    expect(paymentResult.folio.balance).toBe(BigInt(0));

    // 6. CHECK-OUT WIZARD: Settle and transition to CHECKED_OUT, spawn Housekeeping
    const roomUpdateSpy = vi.fn().mockResolvedValue({});
    const hkTaskCreateSpy = vi.fn().mockResolvedValue({});

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: bookingId,
            bookingNumber: 'BK-2026-E2E',
            status: 'IN_HOUSE',
            bookingRooms: [{ id: 'br-e2e', roomId }],
            folios: [{ id: folioId, balance: BigInt(0) }], // Settled!
          }),
          update: vi.fn().mockResolvedValue({ id: bookingId, status: 'CHECKED_OUT' }),
        },
        bookingRoom: { update: vi.fn().mockResolvedValue({}) },
        room: { update: roomUpdateSpy },
        housekeepingTask: { create: hkTaskCreateSpy },
      };
      return cb(mockTx);
    });

    const checkOutResult = await frontOfficeService.checkOut(propertyId, { bookingId });
    expect(checkOutResult.booking.status).toBe('CHECKED_OUT');
    expect(roomUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operationalStatus: 'AVAILABLE',
          housekeepingStatus: 'DIRTY',
          isClean: false,
        }),
      }),
    );
    expect(hkTaskCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskType: 'CHECKOUT_CLEAN',
          status: 'PENDING',
        }),
      }),
    );
  });
});
