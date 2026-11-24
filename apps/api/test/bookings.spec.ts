import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { TaxService } from '../src/modules/tax/tax.service.js';
import { EventsGateway } from '../src/modules/websocket/events.gateway.js';
import { prisma } from '@hospitality/database';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('BookingsService & Double-Booking Protection', () => {
  let bookingsService: BookingsService;
  let taxService: TaxService;
  let eventsGateway: EventsGateway;

  beforeEach(() => {
    taxService = new TaxService();
    eventsGateway = new EventsGateway();
    bookingsService = new BookingsService(taxService, eventsGateway);
    vi.clearAllMocks();
  });

  const mockPropertyId = 'prop-winotosastro';

  it('should reject booking if physical room has an overlapping reservation (Double-Booking Protection)', async () => {
    const dto = {
      primaryGuest: { firstName: 'Budi', email: 'budi@example.com' },
      roomTypeId: 'rt-dlx',
      roomId: 'room-206',
      ratePlanId: 'rp-ro',
      checkInDate: '2026-11-25',
      checkOutDate: '2026-11-27',
    };

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: { findFirst: vi.fn().mockResolvedValue(null) },
        bookingRoom: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'br-existing',
            roomId: 'room-206',
            checkInDate: new Date('2026-11-24'),
            checkOutDate: new Date('2026-11-26'),
          }),
        },
      };
      return cb(mockTx);
    });

    await expect(bookingsService.createBooking(mockPropertyId, dto)).rejects.toThrow(
      ConflictException
    );
  });

  it('should return existing booking when duplicate OTA channelReference arrives (Idempotent OTA intake)', async () => {
    const dto = {
      primaryGuest: { firstName: 'Agoda Guest', email: 'guest@agoda.com' },
      roomTypeId: 'rt-dlx',
      ratePlanId: 'rp-ro',
      checkInDate: '2026-11-25',
      checkOutDate: '2026-11-27',
      channelReference: 'AGD-RETRY-99120',
      bookingSource: 'AGODA',
    };

    const existingBooking = {
      id: 'bk-existing-1',
      bookingNumber: 'BK-2026-1001',
      channelReference: 'AGD-RETRY-99120',
      bookingRooms: [{ id: 'br-1', room: null, roomType: { name: 'Deluxe King' } }],
      folios: [{ id: 'fol-1' }],
      primaryGuest: { firstName: 'Agoda Guest' },
    };

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: { findFirst: vi.fn().mockResolvedValue(existingBooking) },
      };
      return cb(mockTx);
    });

    const result = await bookingsService.createBooking(mockPropertyId, dto);

    expect(result.isDuplicateOta).toBe(true);
    expect(result.booking.id).toBe('bk-existing-1');
  });

  it('should restore inventory availability in inventory_ledger when a booking is cancelled', async () => {
    const mockBookingId = 'bk-cancel-test';
    const checkIn = new Date('2026-11-25');
    const checkOut = new Date('2026-11-27'); // 2 nights: 25 and 26

    const ledgerUpdateSpy = vi.fn().mockResolvedValue({});

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: mockBookingId,
            propertyId: mockPropertyId,
            status: 'CONFIRMED',
            bookingRooms: [
              {
                id: 'br-1',
                roomTypeId: 'rt-dlx',
                checkInDate: checkIn,
                checkOutDate: checkOut,
              },
            ],
          }),
          update: vi.fn().mockResolvedValue({ id: mockBookingId, status: 'CANCELLED' }),
        },
        inventoryLedger: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ledger-dlx-25',
            bookedCount: 3,
            availableCount: 12,
          }),
          update: ledgerUpdateSpy,
        },
        bookingRoom: { updateMany: vi.fn().mockResolvedValue({}) },
        outboxEvent: { create: vi.fn().mockResolvedValue({}) },
      };
      return cb(mockTx);
    });

    vi.spyOn(eventsGateway, 'broadcastTapeChartUpdate').mockImplementation(() => {});

    await bookingsService.cancelBooking(mockPropertyId, mockBookingId, 'Guest request');

    // Exactly 2 nights (25th and 26th) restored, NOT checkout date (27th)
    expect(ledgerUpdateSpy).toHaveBeenCalledTimes(2);
    expect(ledgerUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookedCount: { decrement: 1 },
          availableCount: { increment: 1 },
        }),
      })
    );
  });

  it('should not double-decrement inventory_ledger when assigning physical room to unassigned OTA booking (moveRoom)', async () => {
    const bookingRoomId = 'br-unassigned-1';
    const targetRoomId = 'room-201';

    const ledgerUpdateSpy = vi.fn();

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        bookingRoom: {
          findUnique: vi.fn().mockResolvedValue({
            id: bookingRoomId,
            roomId: null, // previously unassigned
            checkInDate: new Date('2026-11-25'),
            checkOutDate: new Date('2026-11-27'),
            booking: { propertyId: mockPropertyId },
          }),
          findFirst: vi.fn().mockResolvedValue(null), // target room is free!
          update: vi.fn().mockResolvedValue({
            id: bookingRoomId,
            roomId: targetRoomId,
            room: { roomNumber: '201' },
          }),
        },
        inventoryLedger: {
          update: ledgerUpdateSpy, // should NOT be touched
        },
      };
      return cb(mockTx);
    });

    vi.spyOn(eventsGateway, 'broadcastTapeChartUpdate').mockImplementation(() => {});

    const result = await bookingsService.moveRoom(mockPropertyId, {
      bookingRoomId,
      targetRoomId,
    });

    expect(result.roomId).toBe(targetRoomId);
    // Inventory ledger is NOT decremented again because it was already held when reservation arrived!
    expect(ledgerUpdateSpy).not.toHaveBeenCalled();
  });

  it('should adjust old and new nights in inventory_ledger upon stay date modification', async () => {
    const bookingId = 'bk-modify-dates';
    const oldCheckIn = new Date('2026-11-25');
    const oldCheckOut = new Date('2026-11-27'); // 25, 26
    const newCheckIn = '2026-11-26';
    const newCheckOut = '2026-11-28'; // 26, 27 (25 vacated, 27 added, 26 unchanged)

    const ledgerUpdates: any[] = [];

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      const mockTx = {
        booking: {
          findFirst: vi.fn().mockResolvedValue({
            id: bookingId,
            propertyId: mockPropertyId,
            bookingRooms: [
              {
                id: 'br-1',
                roomTypeId: 'rt-sup',
                checkInDate: oldCheckIn,
                checkOutDate: oldCheckOut,
              },
            ],
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        inventoryLedger: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ledger-item',
            availableCount: 5,
            bookedCount: 2,
          }),
          update: vi.fn().mockImplementation((args) => {
            ledgerUpdates.push(args.data);
            return Promise.resolve({});
          }),
        },
        bookingRoom: { updateMany: vi.fn().mockResolvedValue({}) },
      };
      return cb(mockTx);
    });

    vi.spyOn(eventsGateway, 'broadcastTapeChartUpdate').mockImplementation(() => {});

    await bookingsService.modifyStayDates(mockPropertyId, bookingId, newCheckIn, newCheckOut);

    // 25th was vacated (decrements bookedCount, increments availableCount)
    // 27th was newly booked (increments bookedCount, decrements availableCount)
    // 26th is common to both ranges so it is unchanged!
    expect(ledgerUpdates).toHaveLength(2);
    expect(ledgerUpdates[0]).toEqual({ bookedCount: { decrement: 1 }, availableCount: { increment: 1 } });
    expect(ledgerUpdates[1]).toEqual({ bookedCount: { increment: 1 }, availableCount: { decrement: 1 } });
  });
});
