import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@hospitality/database';
import { CreateBookingDto, MoveRoomDto } from './bookings.dto.js';
import { TaxService } from '../tax/tax.service.js';
import { EventsGateway } from '../websocket/events.gateway.js';

@Injectable()
export class BookingsService {
  constructor(
    private readonly taxService: TaxService,
    private readonly eventsGateway: EventsGateway
  ) { }

  /**
   * Generates a date array between [start, end)
   */
  private getDatesInRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const curr = new Date(start);
    while (curr < end) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }

  /**
   * Creates a booking with double-booking prevention:
   * 1. Validates physical room overlap (if roomId is specified).
   * 2. Reserves room-type inventory across all stay dates in inventory_ledger.
   * 3. Calculates room charges and configurable PBJT/Service taxes.
   * 4. Creates primary Guest, Booking, BookingRoom, and initial Folio.
   * 5. Emits outbox event and broadcasts realtime WebSocket notification.
   */
  async createBooking(propertyId: string, dto: CreateBookingDto) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);

    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out date must be strictly after check-in date');
    }

    const stayNights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (stayNights < 1) {
      throw new BadRequestException('Stay duration must be at least 1 night');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 0. Check duplicate OTA reservation ID (Idempotent OTA intake)
      if (dto.channelReference) {
        const existing = await tx.booking.findFirst({
          where: { propertyId, channelReference: dto.channelReference },
          include: {
            bookingRooms: { include: { room: true, roomType: true } },
            folios: true,
            primaryGuest: true,
          },
        });
        if (existing) {
          return {
            booking: existing,
            bookingRoom: existing.bookingRooms[0],
            folio: existing.folios[0],
            guest: existing.primaryGuest,
            isDuplicateOta: true,
          };
        }
      }

      // 1. If physical roomId provided, check for overlapping bookings
      if (dto.roomId) {
        const overlap = await tx.bookingRoom.findFirst({
          where: {
            roomId: dto.roomId,
            roomStatus: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        });

        if (overlap) {
          throw new ConflictException(
            `Room assignment conflict: Physical room is already reserved from ${overlap.checkInDate.toISOString().split('T')[0]} to ${overlap.checkOutDate.toISOString().split('T')[0]}`
          );
        }
      }

      // 2. Fetch room type and base pricing
      const ratePlanRoom = await tx.ratePlanRoom.findUnique({
        where: {
          ratePlanId_roomTypeId: {
            ratePlanId: dto.ratePlanId,
            roomTypeId: dto.roomTypeId,
          },
        },
      });

      const nightlyBaseRate = ratePlanRoom ? ratePlanRoom.basePrice : BigInt(750000);
      const totalBaseAmount = nightlyBaseRate * BigInt(stayNights);

      // 3. Check and hold inventory in inventory_ledger for each stay date
      const stayDates = this.getDatesInRange(checkIn, checkOut);
      for (const d of stayDates) {
        const ledger = await tx.inventoryLedger.findUnique({
          where: {
            propertyId_roomTypeId_date: {
              propertyId,
              roomTypeId: dto.roomTypeId,
              date: d,
            },
          },
        });

        if (ledger) {
          if (ledger.availableCount <= 0) {
            throw new ConflictException(
              `Sold out: No inventory available for room type on ${d.toISOString().split('T')[0]}`
            );
          }
          await tx.inventoryLedger.update({
            where: { id: ledger.id },
            data: {
              bookedCount: { increment: 1 },
              availableCount: { decrement: 1 },
              lockVersion: { increment: 1 },
            },
          });
        }
      }

      // 4. Calculate dynamic taxes (PBJT + Service Charge)
      const taxCalc = await this.taxService.calculateTaxes(
        propertyId,
        totalBaseAmount,
        dto.ratePlanId,
        'IDR'
      );

      // 5. Create or connect Guest
      let guest = dto.primaryGuest.email
        ? await tx.guest.findFirst({
          where: { propertyId, email: dto.primaryGuest.email },
        })
        : null;

      if (!guest) {
        guest = await tx.guest.create({
          data: {
            propertyId,
            firstName: dto.primaryGuest.firstName,
            lastName: dto.primaryGuest.lastName,
            email: dto.primaryGuest.email,
            phone: dto.primaryGuest.phone,
            idType: dto.primaryGuest.idType,
            idNumber: dto.primaryGuest.idNumber,
          },
        });
      }

      // 6. Generate sequential booking number
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingNumber = `BK-${new Date().getFullYear()}-${randomSuffix}`;

      // 7. Create Booking
      const booking = await tx.booking.create({
        data: {
          propertyId,
          bookingNumber,
          channelReference: dto.channelReference,
          primaryGuestId: guest.id,
          bookingSource: dto.bookingSource || 'DIRECT',
          status: 'CONFIRMED',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          totalAmount: taxCalc.grossAmount,
          currency: 'IDR',
          paymentStatus: 'UNPAID',
          specialRequests: dto.specialRequests,
        },
      });

      // 8. Create BookingRoom (roomId nullable for unassigned reservations)
      const bookingRoom = await tx.bookingRoom.create({
        data: {
          bookingId: booking.id,
          roomTypeId: dto.roomTypeId,
          roomId: dto.roomId || null,
          ratePlanId: dto.ratePlanId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          roomRate: nightlyBaseRate,
          currency: 'IDR',
          roomStatus: 'CONFIRMED',
        },
        include: {
          roomType: true,
          room: true,
          ratePlan: true,
        },
      });

      // 9. Create BookingGuest junction
      await tx.bookingGuest.create({
        data: {
          bookingId: booking.id,
          guestId: guest.id,
          isPrimary: true,
          guestType: 'ADULT',
        },
      });

      // 10. Generate Folio and post initial charges
      const folioNumber = `FOL-${bookingNumber}`;
      const folio = await tx.folio.create({
        data: {
          propertyId,
          bookingId: booking.id,
          folioNumber,
          status: 'OPEN',
          totalCharges: taxCalc.grossAmount,
          balance: taxCalc.grossAmount,
          currency: 'IDR',
        },
      });

      // Post Room Charge
      await tx.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionType: 'CHARGE',
          category: 'ROOM',
          amount: totalBaseAmount,
          currency: 'IDR',
          description: `Room Charge (${stayNights} Nights @ ${nightlyBaseRate.toString()} IDR)`,
        },
      });

      // Post Tax & Service Charge Transactions
      for (const taxDetail of taxCalc.details) {
        await tx.folioTransaction.create({
          data: {
            folioId: folio.id,
            transactionType: 'CHARGE',
            category: taxDetail.code.includes('PBJT') ? 'TAX_PBJT' : 'SERVICE_CHARGE',
            amount: taxDetail.amount,
            currency: 'IDR',
            description: `${taxDetail.name} (${taxDetail.ratePercentage}%)`,
          },
        });
      }

      // 11. Transactional Outbox Event
      await tx.outboxEvent.create({
        data: {
          eventType: 'booking.created',
          aggregateType: 'Booking',
          aggregateId: booking.id,
          payload: {
            bookingId: booking.id,
            bookingNumber,
            roomTypeId: dto.roomTypeId,
            roomId: dto.roomId,
            checkInDate: dto.checkInDate,
            checkOutDate: dto.checkOutDate,
            grossAmount: taxCalc.grossAmount.toString(),
          },
        },
      });

      return {
        booking,
        bookingRoom,
        folio,
        guest,
        taxBreakdown: taxCalc,
      };
    });

    // 12. WebSocket Broadcast (AFTER transaction commits successfully)
    if (result && !result.isDuplicateOta) {
      this.eventsGateway.broadcastNewBooking(propertyId, {
        bookingId: result.booking.id,
        bookingNumber: result.booking.bookingNumber,
        guestName: `${result.guest.firstName} ${result.guest.lastName || ''}`.trim(),
        roomType: result.bookingRoom.roomType.name,
        roomNumber: result.bookingRoom.room?.roomNumber || 'Unassigned',
      });
    }

    return result;
  }

  /**
   * Room Move & Reassignment (Drag & Drop on Tape Chart)
   */
  async moveRoom(propertyId: string, dto: MoveRoomDto) {
    const result = await prisma.$transaction(async (tx) => {
      const bookingRoom = await tx.bookingRoom.findUnique({
        where: { id: dto.bookingRoomId },
        include: { booking: true },
      });

      if (!bookingRoom || bookingRoom.booking.propertyId !== propertyId) {
        throw new NotFoundException('Booking room reservation not found');
      }

      // Check if target physical room is available during this stay
      const overlap = await tx.bookingRoom.findFirst({
        where: {
          id: { not: dto.bookingRoomId },
          roomId: dto.targetRoomId,
          roomStatus: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
          checkInDate: { lt: bookingRoom.checkOutDate },
          checkOutDate: { gt: bookingRoom.checkInDate },
        },
      });

      if (overlap) {
        throw new ConflictException(
          `Target room is occupied from ${overlap.checkInDate.toISOString().split('T')[0]} to ${overlap.checkOutDate.toISOString().split('T')[0]}`
        );
      }

      const updated = await tx.bookingRoom.update({
        where: { id: dto.bookingRoomId },
        data: { roomId: dto.targetRoomId },
        include: { room: true, roomType: true },
      });

      return updated;
    });

    this.eventsGateway.broadcastTapeChartUpdate(propertyId, {
      action: 'ROOM_MOVED',
      bookingRoomId: dto.bookingRoomId,
      newRoomNumber: result.room?.roomNumber,
    });

    return result;
  }

  /**
   * Cancels a booking and restores inventory ledger counts
   */
  async cancelBooking(propertyId: string, bookingId: string, reason?: string) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, propertyId },
        include: { bookingRooms: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking '${bookingId}' not found`);
      }

      if (booking.status === 'CANCELLED') {
        return booking;
      }

      if (
        booking.status === 'CHECKED_IN' ||
        booking.status === 'IN_HOUSE' ||
        booking.status === 'CHECKED_OUT'
      ) {
        throw new BadRequestException(
          'Reservasi yang sudah Check-In atau Check-Out tidak dapat dibatalkan (cancel).'
        );
      }

      // 1. Release inventory
      for (const br of booking.bookingRooms) {
        const stayDates = this.getDatesInRange(br.checkInDate, br.checkOutDate);
        for (const d of stayDates) {
          const ledger = await tx.inventoryLedger.findUnique({
            where: {
              propertyId_roomTypeId_date: {
                propertyId,
                roomTypeId: br.roomTypeId,
                date: d,
              },
            },
          });

          if (ledger && ledger.bookedCount > 0) {
            await tx.inventoryLedger.update({
              where: { id: ledger.id },
              data: {
                bookedCount: { decrement: 1 },
                availableCount: { increment: 1 },
                lockVersion: { increment: 1 },
              },
            });
          }
        }
      }

      // 2. Update booking and room status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          specialRequests: reason ? `${booking.specialRequests || ''}\n[Cancelled]: ${reason}` : booking.specialRequests,
        },
      });

      await tx.bookingRoom.updateMany({
        where: { bookingId },
        data: { roomStatus: 'CANCELLED' },
      });

      // 3. Outbox event
      await tx.outboxEvent.create({
        data: {
          eventType: 'booking.cancelled',
          aggregateType: 'Booking',
          aggregateId: bookingId,
          payload: { bookingId, reason },
        },
      });

      return updated;
    });

    this.eventsGateway.broadcastTapeChartUpdate(propertyId, {
      action: 'BOOKING_CANCELLED',
      bookingId,
    });

    return result;
  }

  /**
   * Modifies stay dates: reclaims old nights and holds newly added nights in inventory_ledger
   */
  async modifyStayDates(
    propertyId: string,
    bookingId: string,
    newCheckInDate: string,
    newCheckOutDate: string
  ) {
    const newCheckIn = new Date(newCheckInDate);
    const newCheckOut = new Date(newCheckOutDate);

    if (newCheckIn >= newCheckOut) {
      throw new BadRequestException('Check-out date must be strictly after check-in date');
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, propertyId },
        include: { bookingRooms: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking '${bookingId}' not found`);
      }

      for (const br of booking.bookingRooms) {
        const oldDates = this.getDatesInRange(br.checkInDate, br.checkOutDate);
        const newDates = this.getDatesInRange(newCheckIn, newCheckOut);

        const oldSet = new Set(oldDates.map((d) => d.toISOString().split('T')[0]));
        const newSet = new Set(newDates.map((d) => d.toISOString().split('T')[0]));

        // Reclaim dates vacated
        for (const oldD of oldDates) {
          const key = oldD.toISOString().split('T')[0];
          if (!newSet.has(key)) {
            const ledger = await tx.inventoryLedger.findUnique({
              where: {
                propertyId_roomTypeId_date: {
                  propertyId,
                  roomTypeId: br.roomTypeId,
                  date: oldD,
                },
              },
            });
            if (ledger && ledger.bookedCount > 0) {
              await tx.inventoryLedger.update({
                where: { id: ledger.id },
                data: {
                  bookedCount: { decrement: 1 },
                  availableCount: { increment: 1 },
                },
              });
            }
          }
        }

        // Reserve newly added dates
        for (const newD of newDates) {
          const key = newD.toISOString().split('T')[0];
          if (!oldSet.has(key)) {
            const ledger = await tx.inventoryLedger.findUnique({
              where: {
                propertyId_roomTypeId_date: {
                  propertyId,
                  roomTypeId: br.roomTypeId,
                  date: newD,
                },
              },
            });
            if (ledger) {
              if (ledger.availableCount <= 0) {
                throw new ConflictException(`Sold out on new date: ${key}`);
              }
              await tx.inventoryLedger.update({
                where: { id: ledger.id },
                data: {
                  bookedCount: { increment: 1 },
                  availableCount: { decrement: 1 },
                },
              });
            }
          }
        }
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          checkInDate: newCheckIn,
          checkOutDate: newCheckOut,
        },
      });

      await tx.bookingRoom.updateMany({
        where: { bookingId },
        data: {
          checkInDate: newCheckIn,
          checkOutDate: newCheckOut,
        },
      });

      return updated;
    });

    this.eventsGateway.broadcastTapeChartUpdate(propertyId, {
      action: 'DATES_MODIFIED',
      bookingId,
    });

    return result;
  }

  /**
   * Tape Chart Dataset: returns rooms by floor, dates, assigned reservations, and unassigned queue
   */
  async getTapeChartGrid(propertyId: string, startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const [rooms, bookingRooms] = await Promise.all([
      prisma.room.findMany({
        where: { propertyId },
        include: {
          floor: true,
          roomType: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }],
      }),
      prisma.bookingRoom.findMany({
        where: {
          booking: { propertyId },
          roomStatus: { not: 'CANCELLED' },
          checkInDate: { lt: end },
          checkOutDate: { gt: start },
        },
        include: {
          booking: {
            include: { primaryGuest: true },
          },
          roomType: true,
          ratePlan: true,
          room: true,
        },
      }),
    ]);

    // Partition assigned vs unassigned bookings
    const assigned = bookingRooms.filter((br) => br.roomId !== null);
    const unassigned = bookingRooms.filter((br) => br.roomId === null);

    return {
      propertyId,
      dateRange: { start: startDateStr, end: endDateStr },
      rooms,
      assignedReservations: assigned,
      unassignedReservations: unassigned,
    };
  }

  async listBookings(propertyId: string, status?: string) {
    return prisma.booking.findMany({
      where: {
        propertyId,
        ...(status ? { status } : {}),
      },
      include: {
        primaryGuest: true,
        bookingRooms: {
          include: {
            room: true,
            roomType: true,
            ratePlan: true,
          },
        },
        folios: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
