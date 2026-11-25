import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@hospitality/database';
import {
  CheckOutPmsDto,
  CreatePmsBookingDto,
  CreatePublicBookingDto,
  ExtendPmsStayDto,
  RecordPmsPaymentDto,
  SettleOtaBatchDto,
  UpdatePmsSettingsDto,
} from './pms.dto.js';
import { PropertiesService } from '../properties/properties.service.js';

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getTodayJakartaDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function mapDbStatusToUi(status: string): 'CONFIRMED' | 'IN_HOUSE' | 'CHECKED_OUT' {
  if (status === 'CHECKED_IN' || status === 'IN_HOUSE') return 'IN_HOUSE';
  if (status === 'CHECKED_OUT') return 'CHECKED_OUT';
  return 'CONFIRMED';
}

function mapSourceToUi(source: string): 'DIRECT' | 'AGODA' | 'WALK_IN' | 'CORPORATE' {
  const s = (source || 'DIRECT').toUpperCase();
  if (s === 'AGODA' || s === 'BOOKING_COM' || s === 'TRAVELOKA' || s === 'EXPEDIA' || s === 'OTA') {
    return 'AGODA';
  }
  if (s === 'WALK_IN') return 'WALK_IN';
  if (s === 'CORPORATE') return 'CORPORATE';
  return 'DIRECT';
}

function splitGuestName(fullName: string): { firstName: string; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || 'Guest';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  return { firstName, lastName };
}

function getGuestFullName(guest?: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!guest) return 'Guest';
  return `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
}

function resolveRoomTypeBaseRate(roomType: { code?: string; name?: string; ratePlanRooms?: Array<{ basePrice: bigint }> }): number {
  const prices = (roomType.ratePlanRooms || []).map((r) => Number(r.basePrice)).filter((n) => n > 0);
  if (prices.length > 0) return Math.min(...prices);
  const name = (roomType.name || '').toLowerCase();
  if (name.includes('family') || name.includes('presidential')) return 1850000;
  if (name.includes('executive') || name.includes('suite')) return 1450000;
  if (name.includes('deluxe')) return 880000;
  return 650000;
}

@Injectable()
export class PmsService {
  constructor(private readonly propertiesService: PropertiesService) {}

  private mapBookingToTapeChart(b: any) {
    const primaryRoom = b.bookingRooms?.[0];
    const meta = (b.metadata as Record<string, unknown>) || {};
    const totalAmount = Number(b.totalAmount || 0);
    const payments = (b.payments || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.paymentMethod,
      reference: p.gatewayTransactionId || (p.metadata as any)?.reference || undefined,
      notes: (p.metadata as any)?.notes || undefined,
      date: toIsoDate(new Date(p.createdAt)),
    }));
    const paidSum = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalPaid = Math.max(Number(b.totalPaid || 0), paidSum);

    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      source: mapSourceToUi(b.bookingSource),
      reservationType: (meta.reservationType as string) || (b.bookingSource === 'WALK_IN' ? 'WALK_IN' : 'FIT'),
      guestName: getGuestFullName(b.primaryGuest),
      phone: b.primaryGuest?.phone || undefined,
      idNumber: b.primaryGuest?.idNumber || undefined,
      idType: b.primaryGuest?.idType || undefined,
      roomNumber: primaryRoom?.room?.roomNumber || 'UNASSIGNED',
      roomType: primaryRoom?.roomType?.name || 'Standard',
      ratePlan: primaryRoom?.ratePlan?.name || 'Room Only',
      checkInDate: toIsoDate(new Date(b.checkInDate)),
      checkOutDate: toIsoDate(new Date(b.checkOutDate)),
      status: mapDbStatusToUi(b.status),
      totalAmount,
      balance: Math.max(0, totalAmount - totalPaid),
      payments,
      notes: b.specialRequests || (meta.notes as string) || undefined,
    };
  }

  async getBootstrap(propertyId: string) {
    const [property, rooms, roomTypes, bookings, settlements, taxConfigs] = await Promise.all([
      prisma.property.findUnique({ where: { id: propertyId } }),
      prisma.room.findMany({
        where: { propertyId },
        include: { roomType: { include: { ratePlanRooms: true } }, floor: true },
        orderBy: { roomNumber: 'asc' },
      }),
      prisma.roomType.findMany({
        where: { propertyId, isActive: true },
        include: { ratePlanRooms: true },
        orderBy: { name: 'asc' },
      }),
      prisma.booking.findMany({
        where: { propertyId, status: { not: 'CANCELLED' } },
        include: {
          primaryGuest: true,
          bookingRooms: {
            include: { room: true, roomType: true, ratePlan: true },
          },
          payments: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.otaSettlement.findMany({
        where: { propertyId },
        orderBy: { checkInDate: 'desc' },
      }),
      prisma.taxConfiguration.findMany({
        where: { propertyId, isActive: true },
      }),
    ]);

    if (!property) {
      throw new NotFoundException('Property tidak ditemukan');
    }

    const s = (property.settings as Record<string, any>) || {};
    const pbjtTax = taxConfigs.find((t) => t.code.includes('PBJT'));
    const svcTax = taxConfigs.find((t) => t.code.includes('SERVICE'));

    return {
      settings: {
        hotelName: property.name,
        propertyCode: property.code,
        address: property.address || '',
        city: property.city,
        country: 'Indonesia (ID)',
        phone: s.phone || '+62 271 718899',
        email: s.email || 'info@hotel.co.id',
        npwpd: s.npwpd || '',
        logoUrl: s.logoUrl || '',
        checkInTime: s.checkInTime || '14:00 WIB',
        checkOutTime: s.checkOutTime || '12:00 WIB',
        currency: property.defaultCurrency || 'IDR',
        pbjtRate: Number(s.pbjtRate ?? pbjtTax?.ratePercentage ?? 10),
        serviceChargeRate: Number(s.serviceChargeRate ?? svcTax?.ratePercentage ?? 10),
      },
      rooms: rooms.map((r) => ({
        id: r.id,
        number: r.roomNumber,
        type: r.roomType.name,
        floor: r.floor?.floorNumber || 1,
        baseRate: resolveRoomTypeBaseRate(r.roomType),
        housekeepingStatus: r.housekeepingStatus,
        operationalStatus: r.operationalStatus,
      })),
      roomTypes: roomTypes.map((rt) => ({
        id: rt.id,
        code: rt.code,
        name: rt.name,
        baseRate: resolveRoomTypeBaseRate(rt),
        maxCapacity: rt.maxOccupancy,
      })),
      bookings: bookings.map((b) => this.mapBookingToTapeChart(b)),
      settlements: settlements.map((tx) => ({
        id: tx.id,
        otaChannel: tx.otaChannel,
        otaBookingCode: tx.otaBookingCode,
        guestName: tx.guestName,
        roomType: tx.roomType,
        roomNumber: tx.roomNumber,
        checkInDate: tx.checkInDate,
        checkOutDate: tx.checkOutDate,
        grossAmount: Number(tx.grossAmount),
        commissionPercent: tx.commissionPercent,
        commissionAmount: Number(tx.commissionAmount),
        netPayout: Number(tx.netPayout),
        payoutMethod: tx.payoutMethod,
        status: tx.status,
        settledAt: tx.settledAt || undefined,
        settlementReference: tx.settlementReference || undefined,
      })),
    };
  }

  async createBooking(propertyId: string, dto: CreatePmsBookingDto, userId?: string) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkIn >= checkOut) {
      throw new BadRequestException('Tanggal check-out harus lebih lambat dari tanggal check-in.');
    }

    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));

    const created = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findFirst({
        where: { propertyId, roomNumber: dto.roomNumber },
        include: { roomType: { include: { ratePlanRooms: true } } },
      });
      if (!room) {
        throw new NotFoundException(`Kamar ${dto.roomNumber} tidak ditemukan.`);
      }

      const overlap = await tx.bookingRoom.findFirst({
        where: {
          roomId: room.id,
          roomStatus: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
          booking: { status: { notIn: ['CANCELLED', 'CHECKED_OUT'] } },
          checkInDate: { lt: checkOut },
          checkOutDate: { gt: checkIn },
        },
        include: { booking: { include: { primaryGuest: true } } },
      });
      if (overlap) {
        throw new ConflictException(
          `Kamar ${dto.roomNumber} sudah dipesan oleh ${getGuestFullName(overlap.booking.primaryGuest)} pada tanggal tersebut.`
        );
      }

      const ratePlan =
        (await tx.ratePlan.findFirst({
          where: {
            propertyId,
            OR: [{ name: dto.ratePlan || 'Room Only' }, { code: 'RO' }],
          },
        })) ||
        (await tx.ratePlan.create({
          data: { propertyId, code: 'RO', name: dto.ratePlan || 'Room Only', description: 'Kamar Saja' },
        }));

      const ratePerNight =
        dto.nightlyRate && dto.nightlyRate > 0 ? dto.nightlyRate : resolveRoomTypeBaseRate(room.roomType);
      const subtotal = ratePerNight * nights;
      const service = Math.round(subtotal * 0.1);
      const pbjt = Math.round((subtotal + service) * 0.1);
      const totalAmount = subtotal + service + pbjt;

      const initPaid =
        dto.initialPaymentMethod && dto.initialPaymentMethod !== 'NONE' && (dto.initialPaymentAmount || 0) > 0
          ? Math.min(totalAmount, Math.round(dto.initialPaymentAmount || 0))
          : 0;

      const { firstName, lastName } = splitGuestName(dto.guestName);
      const guest = await tx.guest.create({
        data: {
          propertyId,
          firstName,
          lastName,
          phone: dto.phone?.trim() || null,
          idNumber: dto.idNumber?.trim() || null,
          idType: dto.idType || (dto.idNumber ? 'KTP' : null),
        },
      });

      const bookingStatus = dto.autoCheckIn ? 'CHECKED_IN' : 'CONFIRMED';
      const bookingNumber = `BK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const booking = await tx.booking.create({
        data: {
          propertyId,
          bookingNumber,
          primaryGuestId: guest.id,
          bookingSource: dto.source || (dto.reservationType === 'WALK_IN' ? 'WALK_IN' : 'DIRECT'),
          status: bookingStatus,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          actualCheckInAt: dto.autoCheckIn ? new Date() : null,
          totalAmount: BigInt(totalAmount),
          totalPaid: BigInt(initPaid),
          paymentStatus: initPaid >= totalAmount ? 'PAID' : initPaid > 0 ? 'PARTIAL' : 'UNPAID',
          specialRequests: dto.notes?.trim() || null,
          metadata: {
            reservationType: dto.reservationType || 'FIT',
          },
        },
      });

      await tx.bookingRoom.create({
        data: {
          bookingId: booking.id,
          roomTypeId: room.roomTypeId,
          roomId: room.id,
          ratePlanId: ratePlan.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          roomRate: BigInt(ratePerNight),
          roomStatus: bookingStatus,
        },
      });

      if (dto.autoCheckIn) {
        await tx.room.update({
          where: { id: room.id },
          data: { operationalStatus: 'OCCUPIED' },
        });
      }

      const folio = await tx.folio.create({
        data: {
          propertyId,
          bookingId: booking.id,
          folioNumber: `FOL-${bookingNumber}`,
          status: 'OPEN',
          totalCharges: BigInt(totalAmount),
          totalPayments: BigInt(initPaid),
          balance: BigInt(Math.max(0, totalAmount - initPaid)),
        },
      });

      await tx.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionType: 'CHARGE',
          category: 'ROOM',
          amount: BigInt(totalAmount),
          description: `Sewa Kamar ${room.roomNumber} (${nights} malam, incl. Service & PBJT)`,
          createdBy: userId || null,
        },
      });

      if (initPaid > 0 && dto.initialPaymentMethod) {
        await tx.payment.create({
          data: {
            propertyId,
            folioId: folio.id,
            bookingId: booking.id,
            amount: BigInt(initPaid),
            paymentMethod: dto.initialPaymentMethod,
            status: 'SUCCESS',
            metadata: { notes: 'Pembayaran Awal / Deposit Saat Registrasi' },
            createdBy: userId || null,
          },
        });
      }

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          primaryGuest: true,
          bookingRooms: { include: { room: true, roomType: true, ratePlan: true } },
          payments: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    return this.mapBookingToTapeChart(created);
  }

  async checkIn(propertyId: string, bookingId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, propertyId },
        include: { bookingRooms: true },
      });
      if (!booking) throw new NotFoundException('Reservasi tidak ditemukan.');

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CHECKED_IN', actualCheckInAt: new Date() },
      });

      for (const br of booking.bookingRooms) {
        await tx.bookingRoom.update({
          where: { id: br.id },
          data: { roomStatus: 'CHECKED_IN' },
        });
        if (br.roomId) {
          await tx.room.update({
            where: { id: br.roomId },
            data: { operationalStatus: 'OCCUPIED' },
          });
        }
      }

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          primaryGuest: true,
          bookingRooms: { include: { room: true, roomType: true, ratePlan: true } },
          payments: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    return this.mapBookingToTapeChart(updated);
  }

  async checkOut(propertyId: string, bookingId: string, dto: CheckOutPmsDto) {
    const todayStr = dto.todayDate || getTodayJakartaDate();
    const todayDate = new Date(todayStr);

    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, propertyId },
        include: { bookingRooms: true },
      });
      if (!booking) throw new NotFoundException('Reservasi tidak ditemukan.');

      const currentOutStr = toIsoDate(new Date(booking.checkOutDate));
      const isEarly = currentOutStr > todayStr;
      const finalCheckOut = isEarly ? todayDate : booking.checkOutDate;

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_OUT',
          checkOutDate: finalCheckOut,
          actualCheckOutAt: new Date(),
        },
      });

      for (const br of booking.bookingRooms) {
        await tx.bookingRoom.update({
          where: { id: br.id },
          data: {
            roomStatus: 'CHECKED_OUT',
            checkOutDate: finalCheckOut,
          },
        });
        if (br.roomId) {
          await tx.room.update({
            where: { id: br.roomId },
            data: { operationalStatus: 'AVAILABLE', housekeepingStatus: 'DIRTY', isClean: false },
          });
        }
      }

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          primaryGuest: true,
          bookingRooms: { include: { room: true, roomType: true, ratePlan: true } },
          payments: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    return this.mapBookingToTapeChart(updated);
  }

  async extendStay(propertyId: string, bookingId: string, dto: ExtendPmsStayDto, userId?: string) {
    const newOut = new Date(dto.newCheckOutDate);
    if (Number.isNaN(newOut.getTime())) {
      throw new BadRequestException('Tanggal check-out baru tidak valid.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, propertyId },
        include: {
          primaryGuest: true,
          bookingRooms: { include: { room: true, roomType: true, ratePlan: true } },
          folios: true,
        },
      });
      if (!booking) throw new NotFoundException('Reservasi tidak ditemukan.');

      const curOut = new Date(booking.checkOutDate);
      if (newOut <= curOut) {
        throw new BadRequestException('Tanggal check-out baru harus lebih lambat dari tanggal saat ini.');
      }

      const extraNights = Math.max(1, Math.round((newOut.getTime() - curOut.getTime()) / 86_400_000));
      const targetRoom = await tx.room.findFirst({
        where: { propertyId, roomNumber: dto.roomNumber },
        include: { roomType: { include: { ratePlanRooms: true } } },
      });
      if (!targetRoom) throw new NotFoundException(`Kamar ${dto.roomNumber} tidak ditemukan.`);

      const overlap = await tx.bookingRoom.findFirst({
        where: {
          roomId: targetRoom.id,
          bookingId: { not: booking.id },
          roomStatus: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
          booking: { status: { notIn: ['CANCELLED', 'CHECKED_OUT'] } },
          checkInDate: { lt: newOut },
          checkOutDate: { gt: curOut },
        },
      });
      if (overlap) {
        throw new ConflictException(`Kamar ${dto.roomNumber} sudah dipesan pada tanggal perpanjangan.`);
      }

      const ratePerNight =
        dto.nightlyRate && dto.nightlyRate > 0 ? dto.nightlyRate : resolveRoomTypeBaseRate(targetRoom.roomType);
      const subtotalExtra = ratePerNight * extraNights;
      const serviceExtra = Math.round(subtotalExtra * 0.1);
      const pbjtExtra = Math.round((subtotalExtra + serviceExtra) * 0.1);
      const totalExtra = subtotalExtra + serviceExtra + pbjtExtra;

      const currentPrimaryRoom = booking.bookingRooms[0];
      const isMoved = currentPrimaryRoom?.room?.roomNumber !== dto.roomNumber;

      if (isMoved) {
        const extNum = `${booking.bookingNumber}-EXT-${Math.floor(10 + Math.random() * 89)}`;
        const extBooking = await tx.booking.create({
          data: {
            propertyId,
            bookingNumber: extNum,
            primaryGuestId: booking.primaryGuestId,
            bookingSource: booking.bookingSource,
            status: 'CONFIRMED',
            checkInDate: curOut,
            checkOutDate: newOut,
            totalAmount: BigInt(totalExtra),
            totalPaid: BigInt(0),
            paymentStatus: 'UNPAID',
            specialRequests: `Perpanjangan Inap (Pindah dari Kamar ${currentPrimaryRoom?.room?.roomNumber || '-'})`,
            metadata: { reservationType: 'FIT' },
          },
        });
        await tx.bookingRoom.create({
          data: {
            bookingId: extBooking.id,
            roomTypeId: targetRoom.roomTypeId,
            roomId: targetRoom.id,
            ratePlanId: currentPrimaryRoom.ratePlanId,
            checkInDate: curOut,
            checkOutDate: newOut,
            roomRate: BigInt(ratePerNight),
            roomStatus: 'CONFIRMED',
          },
        });
        const extFolio = await tx.folio.create({
          data: {
            propertyId,
            bookingId: extBooking.id,
            folioNumber: `FOL-${extNum}`,
            status: 'OPEN',
            totalCharges: BigInt(totalExtra),
            totalPayments: BigInt(0),
            balance: BigInt(totalExtra),
          },
        });
        await tx.folioTransaction.create({
          data: {
            folioId: extFolio.id,
            transactionType: 'CHARGE',
            category: 'ROOM',
            amount: BigInt(totalExtra),
            description: `Perpanjangan Kamar ${targetRoom.roomNumber} (+${extraNights} mlm)`,
            createdBy: userId || null,
          },
        });
        return { isMoved: true, bookingId: extBooking.id };
      } else {
        const newTotal = Number(booking.totalAmount) + totalExtra;
        const paid = Number(booking.totalPaid);
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            checkOutDate: newOut,
            totalAmount: BigInt(newTotal),
            paymentStatus: paid >= newTotal ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
          },
        });
        if (currentPrimaryRoom) {
          await tx.bookingRoom.update({
            where: { id: currentPrimaryRoom.id },
            data: { checkOutDate: newOut },
          });
        }
        const folio = booking.folios[0];
        if (folio) {
          await tx.folio.update({
            where: { id: folio.id },
            data: {
              totalCharges: BigInt(newTotal),
              balance: BigInt(Math.max(0, newTotal - paid)),
            },
          });
          await tx.folioTransaction.create({
            data: {
              folioId: folio.id,
              transactionType: 'CHARGE',
              category: 'ROOM',
              amount: BigInt(totalExtra),
              description: `Extend Stay Kamar ${dto.roomNumber} (+${extraNights} mlm)`,
              createdBy: userId || null,
            },
          });
        }
        return { isMoved: false, bookingId: booking.id };
      }
    });

    const refreshed = await prisma.booking.findUnique({
      where: { id: result.bookingId },
      include: {
        primaryGuest: true,
        bookingRooms: { include: { room: true, roomType: true, ratePlan: true } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });
    return {
      isMoved: result.isMoved,
      booking: this.mapBookingToTapeChart(refreshed),
    };
  }

  async recordPayment(propertyId: string, bookingId: string, dto: RecordPmsPaymentDto, userId?: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, propertyId },
        include: { folios: true },
      });
      if (!booking) throw new NotFoundException('Reservasi tidak ditemukan.');

      let folio = booking.folios[0];
      if (!folio) {
        folio = await tx.folio.create({
          data: {
            propertyId,
            bookingId: booking.id,
            folioNumber: `FOL-${booking.bookingNumber}`,
            status: 'OPEN',
            totalCharges: booking.totalAmount,
            totalPayments: booking.totalPaid,
            balance: booking.totalAmount - booking.totalPaid,
          },
        });
      }

      const amountBig = BigInt(Math.round(dto.amount));
      await tx.payment.create({
        data: {
          propertyId,
          folioId: folio.id,
          bookingId: booking.id,
          amount: amountBig,
          paymentMethod: dto.method,
          status: 'SUCCESS',
          gatewayTransactionId: dto.reference?.trim() || null,
          metadata: { notes: dto.notes?.trim() || null, recordedDate: dto.date || getTodayJakartaDate() },
          createdBy: userId || null,
        },
      });

      const newPaid = Number(booking.totalPaid) + Math.round(dto.amount);
      const total = Number(booking.totalAmount);
      const newBalance = Math.max(0, total - newPaid);

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          totalPaid: BigInt(newPaid),
          paymentStatus: newPaid >= total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID',
        },
      });

      await tx.folio.update({
        where: { id: folio.id },
        data: {
          totalPayments: BigInt(newPaid),
          balance: BigInt(newBalance),
          status: newBalance === 0 ? 'SETTLED' : 'OPEN',
        },
      });

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          primaryGuest: true,
          bookingRooms: { include: { room: true, roomType: true, ratePlan: true } },
          payments: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    return this.mapBookingToTapeChart(updated);
  }

  async deleteBooking(propertyId: string, bookingId: string) {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, propertyId },
        include: { bookingRooms: true },
      });
      if (!booking) throw new NotFoundException('Reservasi tidak ditemukan.');

      if (booking.status === 'CHECKED_IN') {
        for (const br of booking.bookingRooms) {
          if (br.roomId) {
            await tx.room.update({
              where: { id: br.roomId },
              data: { operationalStatus: 'AVAILABLE' },
            });
          }
        }
      }
      await tx.booking.delete({ where: { id: booking.id } });
    });
    return { deleted: true, id: bookingId };
  }

  async settleOtaTransactions(propertyId: string, dto: SettleOtaBatchDto) {
    const nowStr =
      new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';

    const items = await prisma.otaSettlement.findMany({
      where: { propertyId, id: { in: dto.ids } },
    });

    for (const item of items) {
      await prisma.otaSettlement.update({
        where: { id: item.id },
        data: {
          status: 'SETTLED',
          settledAt: nowStr,
          settlementReference:
            dto.reference ||
            `SETTLE-${item.otaChannel.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        },
      });
    }

    const updatedAll = await prisma.otaSettlement.findMany({
      where: { propertyId },
      orderBy: { checkInDate: 'desc' },
    });
    return updatedAll.map((tx) => ({
      ...tx,
      grossAmount: Number(tx.grossAmount),
      commissionAmount: Number(tx.commissionAmount),
      netPayout: Number(tx.netPayout),
    }));
  }

  async updateSettings(propertyId: string, dto: UpdatePmsSettingsDto) {
    const updated = await this.propertiesService.updatePropertySettings(
      propertyId,
      dto as unknown as Record<string, unknown>
    );
    const s = (updated.settings as Record<string, any>) || {};
    return {
      hotelName: updated.name,
      propertyCode: updated.code,
      address: updated.address || '',
      city: updated.city,
      country: 'Indonesia (ID)',
      phone: s.phone || '',
      email: s.email || '',
      npwpd: s.npwpd || '',
      logoUrl: s.logoUrl || '',
      checkInTime: s.checkInTime || '14:00 WIB',
      checkOutTime: s.checkOutTime || '12:00 WIB',
      currency: updated.defaultCurrency || 'IDR',
      pbjtRate: Number(s.pbjtRate ?? 10),
      serviceChargeRate: Number(s.serviceChargeRate ?? 10),
    };
  }

  // ------------------------------------------------------------------
  // PUBLIC BOOKING ENGINE (Rate-limited, zero sensitive leak)
  // ------------------------------------------------------------------
  private async resolvePublicProperty(slug: string) {
    const cleaned = slug.trim().toLowerCase();
    const candidates = [cleaned.toUpperCase()];
    if (cleaned.includes('winotosastro')) {
      candidates.push('WINOTOSASTRO-SOLO');
    }

    const property = await prisma.property.findFirst({
      where: {
        isActive: true,
        OR: [
          { code: { in: candidates } },
          { code: { contains: cleaned, mode: 'insensitive' } },
        ],
      },
      include: {
        roomTypes: {
          where: { isActive: true },
          include: { ratePlanRooms: true },
          orderBy: { name: 'asc' },
        },
        taxConfigs: { where: { isActive: true } },
      },
    });
    if (!property) {
      throw new NotFoundException('Hotel tidak ditemukan.');
    }
    return property;
  }

  async getPublicHotelInfo(slug: string) {
    const prop = await this.resolvePublicProperty(slug);
    const s = (prop.settings as Record<string, any>) || {};
    return {
      propertyCode: prop.code,
      hotelName: prop.name,
      city: prop.city,
      address: prop.address || '',
      phone: s.phone || '+62 271 718899',
      logoUrl: s.logoUrl || '',
      checkInTime: s.checkInTime || '14:00 WIB',
      checkOutTime: s.checkOutTime || '12:00 WIB',
      pbjtRate: Number(s.pbjtRate ?? 10),
      serviceChargeRate: Number(s.serviceChargeRate ?? 10),
      roomTypes: prop.roomTypes.map((rt) => ({
        code: rt.code,
        name: rt.name,
        baseRate: resolveRoomTypeBaseRate(rt),
        maxCapacity: rt.maxOccupancy,
      })),
    };
  }

  async createPublicBooking(slug: string, dto: CreatePublicBookingDto) {
    const prop = await this.resolvePublicProperty(slug);
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkIn >= checkOut) {
      throw new BadRequestException('Tanggal check-out harus lebih lambat dari tanggal check-in.');
    }
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));

    return prisma.$transaction(async (tx) => {
      const roomType = await tx.roomType.findFirst({
        where: {
          propertyId: prop.id,
          isActive: true,
          OR: [
            { code: dto.roomTypeCode },
            { name: { contains: dto.roomTypeCode, mode: 'insensitive' } },
          ],
        },
        include: { ratePlanRooms: true },
      });
      if (!roomType) {
        throw new NotFoundException('Tipe kamar tidak tersedia.');
      }

      const candidateRooms = await tx.room.findMany({
        where: { propertyId: prop.id, roomTypeId: roomType.id },
        orderBy: { roomNumber: 'asc' },
      });

      let assignedRoom: typeof candidateRooms[number] | null = null;
      for (const rm of candidateRooms) {
        const overlap = await tx.bookingRoom.findFirst({
          where: {
            roomId: rm.id,
            roomStatus: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
            booking: { status: { notIn: ['CANCELLED', 'CHECKED_OUT'] } },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        });
        if (!overlap) {
          assignedRoom = rm;
          break;
        }
      }

      if (!assignedRoom) {
        throw new ConflictException('Maaf, seluruh kamar untuk tipe ini sudah terpesan di tanggal tersebut.');
      }

      const ratePlan =
        (await tx.ratePlan.findFirst({ where: { propertyId: prop.id } })) ||
        (await tx.ratePlan.create({
          data: { propertyId: prop.id, code: 'RO', name: 'Room Only', description: 'Kamar Saja' },
        }));

      const nightly = resolveRoomTypeBaseRate(roomType);
      const subtotal = nightly * nights;
      const service = Math.round(subtotal * 0.1);
      const pbjt = Math.round((subtotal + service) * 0.1);
      const totalAmount = subtotal + service + pbjt;

      const { firstName, lastName } = splitGuestName(dto.guestName);
      const guest = await tx.guest.create({
        data: {
          propertyId: prop.id,
          firstName,
          lastName,
          email: dto.email?.trim() || null,
          phone: dto.phone.trim(),
        },
      });

      const bookingNumber = `WEB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const doorPin = String(Math.floor(100000 + Math.random() * 900000));

      const booking = await tx.booking.create({
        data: {
          propertyId: prop.id,
          bookingNumber,
          primaryGuestId: guest.id,
          bookingSource: 'DIRECT',
          status: 'CONFIRMED',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          totalAmount: BigInt(totalAmount),
          totalPaid: BigInt(totalAmount),
          paymentStatus: 'PAID',
          specialRequests: dto.specialRequests?.trim() || null,
          metadata: { reservationType: 'FIT', doorPin },
        },
      });

      await tx.bookingRoom.create({
        data: {
          bookingId: booking.id,
          roomTypeId: roomType.id,
          roomId: assignedRoom.id,
          ratePlanId: ratePlan.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          roomRate: BigInt(nightly),
          roomStatus: 'CONFIRMED',
        },
      });

      const folio = await tx.folio.create({
        data: {
          propertyId: prop.id,
          bookingId: booking.id,
          folioNumber: `FOL-${bookingNumber}`,
          status: 'SETTLED',
          totalCharges: BigInt(totalAmount),
          totalPayments: BigInt(totalAmount),
          balance: BigInt(0),
        },
      });

      await tx.payment.create({
        data: {
          propertyId: prop.id,
          folioId: folio.id,
          bookingId: booking.id,
          amount: BigInt(totalAmount),
          paymentMethod: dto.paymentMethod || 'QRIS',
          status: 'SUCCESS',
          gateway: 'MIDTRANS',
          gatewayTransactionId: dto.paymentReference || `MID-${Date.now().toString().slice(-8)}`,
        },
      });

      return {
        bookingId: booking.id,
        bookingNumber,
        roomNumber: assignedRoom.roomNumber,
        roomType: roomType.name,
        doorPin,
        totalAmount,
        hotelName: prop.name,
      };
    });
  }
}
