import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '@hospitality/database';
import { PmsService } from '../src/modules/pms/pms.service.js';
import { PropertiesService } from '../src/modules/properties/properties.service.js';

describe('PMS Commercial Business Rules (Taxes ON/OFF, Check-Out Full Payment, Pre-Check-In Cancel)', () => {
  const propertiesService = new PropertiesService();
  const pmsService = new PmsService(propertiesService);
  const propId = 'prop-test-1';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects permanent deleteBooking call (only cancel before check-in is allowed)', async () => {
    await expect(pmsService.deleteBooking(propId, 'bk-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects cancelBooking when guest has already checked in (CHECKED_IN)', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb({
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'bk-inhouse',
            propertyId: propId,
            status: 'CHECKED_IN',
            bookingRooms: [],
            folios: [],
          }),
        },
      });
    });

    await expect(pmsService.cancelBooking(propId, 'bk-inhouse')).rejects.toThrow(BadRequestException);
  });

  it('allows cancelBooking when booking is still CONFIRMED (before check-in)', async () => {
    const bookingUpdateSpy = vi.fn().mockResolvedValue({});
    const bookingRoomUpdateSpy = vi.fn().mockResolvedValue({});
    const folioUpdateSpy = vi.fn().mockResolvedValue({});

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb({
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'bk-conf',
            propertyId: propId,
            status: 'CONFIRMED',
            specialRequests: null,
            metadata: {},
            bookingRooms: [{ id: 'br-1' }],
            folios: [{ id: 'fol-1', status: 'OPEN' }],
          }),
          update: bookingUpdateSpy,
          findUnique: vi.fn().mockResolvedValue({
            id: 'bk-conf',
            bookingNumber: 'BK-001',
            bookingSource: 'DIRECT',
            status: 'CANCELLED',
            checkInDate: new Date('2026-12-01'),
            checkOutDate: new Date('2026-12-02'),
            totalAmount: BigInt(500000),
            totalPaid: BigInt(0),
            primaryGuest: { firstName: 'Budi', lastName: null, phone: '0812' },
            bookingRooms: [],
            payments: [],
            metadata: {},
          }),
        },
        bookingRoom: { updateMany: bookingRoomUpdateSpy },
        folio: { update: folioUpdateSpy },
      });
    });

    const result = await pmsService.cancelBooking(propId, 'bk-conf', 'Tamu batal berangkat');
    expect(result.status).toBe('CANCELLED');
    expect(bookingUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
    );
    expect(bookingRoomUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: { roomStatus: 'CANCELLED' } })
    );
    expect(folioUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'VOID' } })
    );
  });

  it('rejects checkOut when booking has remaining unpaid balance', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb({
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'bk-unpaid',
            propertyId: propId,
            status: 'CHECKED_IN',
            checkOutDate: new Date('2026-11-28'),
            totalAmount: BigInt(1000000),
            totalPaid: BigInt(400000),
            payments: [{ amount: BigInt(400000), status: 'SUCCESS' }],
            bookingRooms: [],
            folios: [],
          }),
        },
      });
    });

    await expect(pmsService.checkOut(propId, 'bk-unpaid', { todayDate: '2026-11-27' })).rejects.toThrow(
      BadRequestException
    );
  });

  it('allows checkOut when booking is 100% fully paid (balance === 0)', async () => {
    const roomUpdateSpy = vi.fn().mockResolvedValue({});
    const folioUpdateSpy = vi.fn().mockResolvedValue({});

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb({
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'bk-paid',
            propertyId: propId,
            status: 'CHECKED_IN',
            checkOutDate: new Date('2026-11-27'),
            totalAmount: BigInt(1000000),
            totalPaid: BigInt(1000000),
            payments: [{ amount: BigInt(1000000), status: 'SUCCESS' }],
            bookingRooms: [{ id: 'br-1', roomId: 'rm-1' }],
            folios: [{ id: 'fol-1', status: 'OPEN' }],
          }),
          update: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue({
            id: 'bk-paid',
            bookingNumber: 'BK-PAID',
            bookingSource: 'DIRECT',
            status: 'CHECKED_OUT',
            checkInDate: new Date('2026-11-25'),
            checkOutDate: new Date('2026-11-27'),
            totalAmount: BigInt(1000000),
            totalPaid: BigInt(1000000),
            primaryGuest: { firstName: 'Siti', lastName: null, phone: '0812' },
            bookingRooms: [],
            payments: [{ id: 'p-1', amount: BigInt(1000000), paymentMethod: 'CASH', createdAt: new Date() }],
            metadata: {},
          }),
        },
        bookingRoom: { update: vi.fn().mockResolvedValue({}) },
        room: { update: roomUpdateSpy },
        folio: { update: folioUpdateSpy },
      });
    });

    const result = await pmsService.checkOut(propId, 'bk-paid', { todayDate: '2026-11-27' });
    expect(result.status).toBe('CHECKED_OUT');
    expect(result.balance).toBe(0);
    expect(folioUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'SETTLED', balance: BigInt(0) } })
    );
    expect(roomUpdateSpy).toHaveBeenCalled();
  });

  it('respects pbjtEnabled=false and serviceChargeEnabled=false when creating a PMS booking', async () => {
    let capturedBookingAmount: bigint | undefined;

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb({
        room: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'rm-101',
            roomNumber: '101',
            roomTypeId: 'rt-1',
            roomType: { name: 'Superior', ratePlanRooms: [] },
          }),
        },
        bookingRoom: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
        ratePlan: {
          findFirst: vi.fn().mockResolvedValue({ id: 'rp-1', name: 'Room Only' }),
        },
        property: {
          findUnique: vi.fn().mockResolvedValue({
            id: propId,
            settings: {
              pbjtEnabled: false,
              serviceChargeEnabled: false,
              pbjtRate: 10,
              serviceChargeRate: 10,
            },
          }),
        },
        taxConfiguration: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        guest: {
          create: vi.fn().mockResolvedValue({ id: 'g-1', firstName: 'Andi', lastName: null }),
        },
        booking: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            capturedBookingAmount = data.totalAmount;
            return { id: 'bk-nett', bookingNumber: data.bookingNumber };
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'bk-nett',
            bookingNumber: 'BK-NETT',
            bookingSource: 'DIRECT',
            status: 'CONFIRMED',
            checkInDate: new Date('2026-12-01'),
            checkOutDate: new Date('2026-12-03'),
            totalAmount: BigInt(1000000),
            totalPaid: BigInt(0),
            primaryGuest: { firstName: 'Andi', lastName: null, phone: null },
            bookingRooms: [],
            payments: [],
            metadata: { taxMeta: { pbjtEnabled: false, serviceChargeEnabled: false } },
          }),
        },
        folio: { create: vi.fn().mockResolvedValue({ id: 'fol-1' }) },
        folioTransaction: { create: vi.fn().mockResolvedValue({}) },
      });
    });

    await pmsService.createBooking(propId, {
      guestName: 'Andi',
      roomNumber: '101',
      checkInDate: '2026-12-01',
      checkOutDate: '2026-12-03',
      nightlyRate: 500000,
    });

    expect(Number(capturedBookingAmount)).toBe(1000000);
  });

  it('allows creating same-day Day Use booking (checkInDate === checkOutDate) with 1 unit tariff', async () => {
    let capturedMeta: any;
    let capturedAmount: bigint | undefined;

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb({
        room: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'rm-102',
            roomNumber: '102',
            roomTypeId: 'rt-1',
            roomType: { name: 'Superior', ratePlanRooms: [] },
          }),
        },
        bookingRoom: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
        ratePlan: {
          findFirst: vi.fn().mockResolvedValue({ id: 'rp-1', name: 'Room Only' }),
        },
        property: {
          findUnique: vi.fn().mockResolvedValue({
            id: propId,
            settings: {
              pbjtEnabled: false,
              serviceChargeEnabled: false,
            },
          }),
        },
        taxConfiguration: { findMany: vi.fn().mockResolvedValue([]) },
        guest: {
          create: vi.fn().mockResolvedValue({ id: 'g-du', firstName: 'Raka', lastName: null }),
        },
        booking: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            capturedMeta = data.metadata;
            capturedAmount = data.totalAmount;
            return { id: 'bk-dayuse', bookingNumber: data.bookingNumber };
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'bk-dayuse',
            bookingNumber: 'BK-DU',
            bookingSource: 'WALK_IN',
            status: 'CHECKED_IN',
            checkInDate: new Date('2026-11-27'),
            checkOutDate: new Date('2026-11-27'),
            totalAmount: BigInt(450000),
            totalPaid: BigInt(450000),
            primaryGuest: { firstName: 'Raka', lastName: null, phone: null },
            bookingRooms: [],
            payments: [],
            metadata: { reservationType: 'WALK_IN', isDayUse: true },
          }),
        },
        roomUpdate: vi.fn(),
        folio: { create: vi.fn().mockResolvedValue({ id: 'fol-du' }) },
        folioTransaction: { create: vi.fn().mockResolvedValue({}) },
      });
    });

    const result = await pmsService.createBooking(propId, {
      guestName: 'Raka',
      roomNumber: '102',
      checkInDate: '2026-11-27',
      checkOutDate: '2026-11-27',
      nightlyRate: 450000,
    });

    expect(capturedMeta?.isDayUse).toBe(true);
    expect(Number(capturedAmount)).toBe(450000);
    expect(result.isDayUse).toBe(true);
  });

  it('rejects Day Use booking when room already has an overlapping Day Use or overnight booking', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb({
        room: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'rm-102',
            roomNumber: '102',
            roomTypeId: 'rt-1',
            roomType: { name: 'Superior', ratePlanRooms: [] },
          }),
        },
        bookingRoom: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'br-existing',
            booking: { primaryGuest: { firstName: 'Tamu Lain', lastName: null } },
          }),
        },
      });
    });

    await expect(
      pmsService.createBooking(propId, {
        guestName: 'Tamu Baru',
        roomNumber: '102',
        checkInDate: '2026-11-27',
        checkOutDate: '2026-11-27',
      })
    ).rejects.toThrow(ConflictException);
  });
});
