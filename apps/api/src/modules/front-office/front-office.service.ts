import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@hospitality/database';
import { EventsGateway } from '../websocket/events.gateway.js';

export interface CheckInDto {
  bookingId: string;
  roomId?: string; // If unassigned, assign physical room
  guestIdType?: string;
  guestIdNumber?: string;
}

export interface CheckOutDto {
  bookingId: string;
  allowUnsettled?: boolean;
}

@Injectable()
export class FrontOfficeService {
  constructor(private readonly eventsGateway: EventsGateway) {}

  async getArrivals(propertyId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    return prisma.booking.findMany({
      where: {
        propertyId,
        checkInDate: targetDate,
        status: 'CONFIRMED',
      },
      include: {
        primaryGuest: true,
        bookingRooms: {
          include: { room: true, roomType: true, ratePlan: true },
        },
        folios: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDepartures(propertyId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    return prisma.booking.findMany({
      where: {
        propertyId,
        checkOutDate: targetDate,
        status: 'IN_HOUSE',
      },
      include: {
        primaryGuest: true,
        bookingRooms: {
          include: { room: true, roomType: true, ratePlan: true },
        },
        folios: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getInHouse(propertyId: string) {
    return prisma.booking.findMany({
      where: {
        propertyId,
        status: 'IN_HOUSE',
      },
      include: {
        primaryGuest: true,
        bookingRooms: {
          include: { room: true, roomType: true, ratePlan: true },
        },
        folios: true,
      },
      orderBy: { actualCheckInAt: 'desc' },
    });
  }

  async checkIn(propertyId: string, dto: CheckInDto) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: dto.bookingId, propertyId },
        include: {
          bookingRooms: { include: { room: true, roomType: true } },
          primaryGuest: true,
        },
      });

      if (!booking) {
        throw new NotFoundException(`Booking '${dto.bookingId}' not found`);
      }

      if (booking.status !== 'CONFIRMED') {
        throw new BadRequestException(`Cannot check in booking with status '${booking.status}'`);
      }

      const bookingRoom = booking.bookingRooms[0];
      const targetRoomId = dto.roomId || bookingRoom.roomId;

      if (!targetRoomId) {
        throw new BadRequestException('Room must be assigned before checking in');
      }

      // Check physical room status
      const room = await tx.room.findUnique({ where: { id: targetRoomId } });
      if (!room) {
        throw new NotFoundException('Physical room not found');
      }

      // Update guest ID if provided
      if (dto.guestIdNumber) {
        await tx.guest.update({
          where: { id: booking.primaryGuestId },
          data: {
            idType: dto.guestIdType || 'KTP',
            idNumber: dto.guestIdNumber,
          },
        });
      }

      // Update Booking & BookingRoom status
      const updatedBooking = await tx.booking.update({
        where: { id: dto.bookingId },
        data: {
          status: 'IN_HOUSE',
          actualCheckInAt: new Date(),
        },
      });

      await tx.bookingRoom.update({
        where: { id: bookingRoom.id },
        data: {
          roomId: targetRoomId,
          roomStatus: 'IN_HOUSE',
        },
      });

      // Update Room status to OCCUPIED
      await tx.room.update({
        where: { id: targetRoomId },
        data: {
          operationalStatus: 'OCCUPIED',
        },
      });

      return { booking: updatedBooking, room };
    });

    this.eventsGateway.broadcastTapeChartUpdate(propertyId, {
      action: 'GUEST_CHECKED_IN',
      bookingId: dto.bookingId,
      roomNumber: result.room.roomNumber,
    });

    return result;
  }

  async checkOut(propertyId: string, dto: CheckOutDto) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: dto.bookingId, propertyId },
        include: {
          bookingRooms: { include: { room: true } },
          folios: true,
        },
      });

      if (!booking) {
        throw new NotFoundException(`Booking '${dto.bookingId}' not found`);
      }

      if (booking.status !== 'IN_HOUSE') {
        throw new BadRequestException(`Cannot check out booking with status '${booking.status}'`);
      }

      // Check Folio Balance
      const folio = booking.folios[0];
      if (folio && folio.balance > 0 && !dto.allowUnsettled) {
        throw new BadRequestException(
          `Folio has outstanding balance of ${folio.balance.toString()} IDR. Settle payment first or specify allowUnsettled.`
        );
      }

      const bookingRoom = booking.bookingRooms[0];

      // Update Booking status
      const updatedBooking = await tx.booking.update({
        where: { id: dto.bookingId },
        data: {
          status: 'CHECKED_OUT',
          actualCheckOutAt: new Date(),
        },
      });

      await tx.bookingRoom.update({
        where: { id: bookingRoom.id },
        data: {
          roomStatus: 'CHECKED_OUT',
        },
      });

      // Update Room to AVAILABLE & Housekeeping DIRTY
      if (bookingRoom.roomId) {
        await tx.room.update({
          where: { id: bookingRoom.roomId },
          data: {
            operationalStatus: 'AVAILABLE',
            housekeepingStatus: 'DIRTY',
            isClean: false,
          },
        });

        // Automatically spawn housekeeping cleaning task
        await tx.housekeepingTask.create({
          data: {
            propertyId,
            roomId: bookingRoom.roomId,
            taskType: 'CHECKOUT_CLEAN',
            status: 'PENDING',
            notes: `Checkout clean after departure of booking ${booking.bookingNumber}`,
          },
        });
      }

      return { booking: updatedBooking, folio };
    });

    this.eventsGateway.broadcastTapeChartUpdate(propertyId, {
      action: 'GUEST_CHECKED_OUT',
      bookingId: dto.bookingId,
    });

    return result;
  }

  /**
   * Night Audit (EOD) Process
   * Scheduled at 02:00 WIB daily:
   * 1. Automatically posts room charge + taxes for active in-house guests.
   * 2. Flags or marks no-shows for unarrived reservations.
   * 3. Rolls business date and generates audit report in night_audits table.
   */
  async executeNightAudit(propertyId: string, executedByUserId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.$transaction(async (tx) => {
      // 1. Fetch In-House Bookings
      const inHouseBookings = await tx.booking.findMany({
        where: {
          propertyId,
          status: 'IN_HOUSE',
        },
        include: {
          bookingRooms: true,
          folios: true,
        },
      });

      let revenuePosted = BigInt(0);

      // Post daily room charges
      for (const b of inHouseBookings) {
        const folio = b.folios[0];
        if (folio && b.bookingRooms[0]) {
          const nightlyRate = b.bookingRooms[0].roomRate;
          const serviceFee = (nightlyRate * BigInt(10)) / BigInt(100);
          const pbjtFee = ((nightlyRate + serviceFee) * BigInt(10)) / BigInt(100);
          const dailyTotal = nightlyRate + serviceFee + pbjtFee;

          await tx.folioTransaction.create({
            data: {
              folioId: folio.id,
              transactionType: 'CHARGE',
              category: 'ROOM_NIGHT_AUDIT',
              amount: dailyTotal,
              currency: 'IDR',
              description: `Daily Room Charge & Taxes (Night Audit: ${today.toISOString().split('T')[0]})`,
              createdBy: executedByUserId,
            },
          });

          await tx.folio.update({
            where: { id: folio.id },
            data: {
              totalCharges: { increment: dailyTotal },
              balance: { increment: dailyTotal },
            },
          });

          revenuePosted += dailyTotal;
        }
      }

      // 2. Mark No-Shows for unarrived confirmed guests
      const noShowBookings = await tx.booking.findMany({
        where: {
          propertyId,
          status: 'CONFIRMED',
          checkInDate: { lte: today },
        },
      });

      for (const ns of noShowBookings) {
        await tx.booking.update({
          where: { id: ns.id },
          data: { status: 'NO_SHOW' },
        });
      }

      // 3. Save Night Audit Summary record
      const nightAudit = await tx.nightAudit.create({
        data: {
          propertyId,
          businessDate: today,
          executedBy: executedByUserId,
          status: 'COMPLETED',
          roomsAudited: inHouseBookings.length,
          revenuePosted,
          summary: {
            inHouseCount: inHouseBookings.length,
            noShowCount: noShowBookings.length,
            totalRevenuePosted: revenuePosted.toString(),
            auditTimestamp: new Date().toISOString(),
          },
        },
      });

      return nightAudit;
    });
  }
}
