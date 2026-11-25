import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@hospitality/database';
import {
  CreateGuestCrmDto,
  CreateRatePlanDto,
  CreateRoomUnitDto,
  MergeGuestsDto,
  TriggerChannelSyncDto,
  UpdateGuestCrmDto,
  UpdateHousekeepingRoomDto,
  UpdateRatePriceDto,
  UpsertRoomTypeDto,
} from './pms-modules.dto.js';

@Injectable()
export class PmsModulesService {
  private getTodayJakartaDate(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  }

  // ------------------------------------------------------------------
  // 1. ROOM TYPES & PHYSICAL ROOMS CRUD
  // ------------------------------------------------------------------
  async listRoomSetup(propertyId: string) {
    const [roomTypes, rooms, floors, ratePlans] = await Promise.all([
      prisma.roomType.findMany({
        where: { propertyId, isActive: true },
        include: {
          ratePlanRooms: { include: { ratePlan: true } },
          _count: { select: { rooms: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.room.findMany({
        where: { propertyId },
        include: { roomType: true, floor: true },
        orderBy: { roomNumber: 'asc' },
      }),
      prisma.floor.findMany({
        where: { propertyId },
        orderBy: { floorNumber: 'asc' },
      }),
      prisma.ratePlan.findMany({
        where: { propertyId, isActive: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    return {
      roomTypes: roomTypes.map((rt) => {
        const roPrice =
          rt.ratePlanRooms.find((rp) => rp.ratePlan.code === 'RO')?.basePrice ??
          rt.ratePlanRooms[0]?.basePrice ??
          BigInt(650000);
        return {
          id: rt.id,
          code: rt.code,
          name: rt.name,
          description: rt.description || '',
          total: rt._count.rooms || rt.totalRooms,
          baseOccupancy: rt.baseOccupancy,
          maxOccupancy: rt.maxOccupancy,
          amenities: rt.amenities,
          baseRate: Number(roPrice),
        };
      }),
      rooms: rooms.map((r) => ({
        id: r.id,
        number: r.roomNumber,
        roomTypeId: r.roomTypeId,
        type: r.roomType.name,
        floor: r.floor.floorNumber,
        floorName: r.floor.name,
        operationalStatus: r.operationalStatus,
        housekeepingStatus: r.housekeepingStatus,
        notes: r.notes || '',
      })),
      floors: floors.map((f) => ({ id: f.id, floorNumber: f.floorNumber, name: f.name })),
      ratePlans: ratePlans.map((rp) => ({
        id: rp.id,
        code: rp.code,
        name: rp.name,
        description: rp.description || '',
      })),
    };
  }

  async createRoomType(propertyId: string, dto: UpsertRoomTypeDto) {
    const cleanCode = dto.code.trim().toUpperCase();
    const existing = await prisma.roomType.findFirst({
      where: { propertyId, code: cleanCode },
    });
    if (existing) {
      throw new ConflictException(`Kode tipe kamar '${cleanCode}' sudah terdaftar.`);
    }

    return prisma.$transaction(async (tx) => {
      const rt = await tx.roomType.create({
        data: {
          propertyId,
          code: cleanCode,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          totalRooms: dto.generateUnits || 0,
          baseOccupancy: 2,
          maxOccupancy: dto.maxOccupancy || 3,
          amenities: dto.amenities || ['Wi-Fi', 'AC'],
        },
      });

      let ratePlans = await tx.ratePlan.findMany({ where: { propertyId } });
      if (ratePlans.length === 0) {
        const ro = await tx.ratePlan.create({
          data: { propertyId, code: 'RO', name: 'Room Only', description: 'Kamar Saja' },
        });
        ratePlans = [ro];
      }

      for (const rp of ratePlans) {
        const price =
          rp.code === 'BB' ? Math.round(dto.baseRate + 100000) : Math.round(dto.baseRate);
        await tx.ratePlanRoom.create({
          data: {
            ratePlanId: rp.id,
            roomTypeId: rt.id,
            basePrice: BigInt(price),
          },
        });
      }

      if (dto.generateUnits && dto.generateUnits > 0) {
        const floorNum = dto.floorNumber || 1;
        let floor = await tx.floor.findFirst({
          where: { propertyId, floorNumber: floorNum },
        });
        if (!floor) {
          floor = await tx.floor.create({
            data: { propertyId, floorNumber: floorNum, name: `Lantai ${floorNum}` },
          });
        }
        let cursor = dto.startRoomNumber || floorNum * 100 + 1;
        let createdCount = 0;
        while (createdCount < dto.generateUnits) {
          const roomNum = String(cursor++);
          const clash = await tx.room.findFirst({ where: { propertyId, roomNumber: roomNum } });
          if (!clash) {
            await tx.room.create({
              data: {
                propertyId,
                roomTypeId: rt.id,
                floorId: floor.id,
                roomNumber: roomNum,
                housekeepingStatus: 'CLEAN',
              },
            });
            createdCount++;
          }
        }
      }

      return { id: rt.id, code: rt.code, name: rt.name };
    });
  }

  async updateRoomType(propertyId: string, roomTypeId: string, dto: Partial<UpsertRoomTypeDto>) {
    const existing = await prisma.roomType.findFirst({
      where: { id: roomTypeId, propertyId },
    });
    if (!existing) throw new NotFoundException('Tipe kamar tidak ditemukan.');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.roomType.update({
        where: { id: existing.id },
        data: {
          name: dto.name?.trim() || existing.name,
          description: dto.description !== undefined ? dto.description : existing.description,
          maxOccupancy: dto.maxOccupancy || existing.maxOccupancy,
          amenities: dto.amenities || existing.amenities,
        },
      });
      if (dto.baseRate && dto.baseRate > 0) {
        const ro = await tx.ratePlan.findFirst({ where: { propertyId, code: 'RO' } });
        if (ro) {
          await tx.ratePlanRoom.upsert({
            where: { ratePlanId_roomTypeId: { ratePlanId: ro.id, roomTypeId: existing.id } },
            update: { basePrice: BigInt(Math.round(dto.baseRate)) },
            create: {
              ratePlanId: ro.id,
              roomTypeId: existing.id,
              basePrice: BigInt(Math.round(dto.baseRate)),
            },
          });
        }
      }
      return updated;
    });
  }

  async createRoomUnit(propertyId: string, dto: CreateRoomUnitDto) {
    const cleanNum = dto.roomNumber.trim();
    const clash = await prisma.room.findFirst({
      where: { propertyId, roomNumber: cleanNum },
    });
    if (clash) {
      throw new ConflictException(`Kamar nomor ${cleanNum} sudah ada.`);
    }

    const roomType = await prisma.roomType.findFirst({
      where: { id: dto.roomTypeId, propertyId },
    });
    if (!roomType) throw new NotFoundException('Tipe kamar tidak ditemukan.');

    let floor = await prisma.floor.findFirst({
      where: { propertyId, floorNumber: dto.floorNumber },
    });
    if (!floor) {
      floor = await prisma.floor.create({
        data: { propertyId, floorNumber: dto.floorNumber, name: `Lantai ${dto.floorNumber}` },
      });
    }

    const room = await prisma.room.create({
      data: {
        propertyId,
        roomTypeId: roomType.id,
        floorId: floor.id,
        roomNumber: cleanNum,
        housekeepingStatus: 'CLEAN',
      },
    });
    await prisma.roomType.update({
      where: { id: roomType.id },
      data: { totalRooms: { increment: 1 } },
    });

    return room;
  }

  async deleteRoomUnit(propertyId: string, roomId: string) {
    const room = await prisma.room.findFirst({ where: { id: roomId, propertyId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan.');

    const activeBooking = await prisma.bookingRoom.findFirst({
      where: {
        roomId: room.id,
        roomStatus: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
        booking: { status: { notIn: ['CANCELLED', 'CHECKED_OUT'] } },
      },
    });
    if (activeBooking) {
      throw new ConflictException('Kamar tidak bisa dihapus karena masih memiliki reservasi aktif.');
    }

    await prisma.room.delete({ where: { id: room.id } });
    return { deleted: true, id: room.id };
  }

  // ------------------------------------------------------------------
  // 2. HOUSEKEEPING
  // ------------------------------------------------------------------
  async listHousekeepingRooms(propertyId: string) {
    const rooms = await prisma.room.findMany({
      where: { propertyId },
      include: { roomType: true, floor: true },
      orderBy: { roomNumber: 'asc' },
    });
    return rooms.map((r) => ({
      id: r.id,
      number: r.roomNumber,
      floor: r.floor.floorNumber,
      type: r.roomType.name,
      status:
        r.operationalStatus === 'OUT_OF_ORDER'
          ? 'OUT_OF_ORDER'
          : (r.housekeepingStatus as 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER'),
      operationalStatus: r.operationalStatus,
      assignedTo: r.notes || 'Housekeeping Team',
      updatedAt: r.updatedAt,
    }));
  }

  async updateHousekeepingRoom(propertyId: string, roomId: string, dto: UpdateHousekeepingRoomDto) {
    const room = await prisma.room.findFirst({ where: { id: roomId, propertyId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan.');

    const isOoo = dto.status === 'OUT_OF_ORDER';
    const updated = await prisma.room.update({
      where: { id: room.id },
      data: {
        housekeepingStatus: isOoo ? 'DIRTY' : dto.status,
        isClean: dto.status === 'CLEAN' || dto.status === 'INSPECTED',
        operationalStatus: isOoo
          ? 'OUT_OF_ORDER'
          : room.operationalStatus === 'OUT_OF_ORDER'
          ? 'AVAILABLE'
          : room.operationalStatus,
        notes: dto.notes !== undefined ? dto.notes : room.notes,
      },
      include: { roomType: true, floor: true },
    });

    return {
      id: updated.id,
      number: updated.roomNumber,
      floor: updated.floor.floorNumber,
      type: updated.roomType.name,
      status:
        updated.operationalStatus === 'OUT_OF_ORDER' ? 'OUT_OF_ORDER' : updated.housekeepingStatus,
      operationalStatus: updated.operationalStatus,
      assignedTo: updated.notes || 'Housekeeping Team',
      updatedAt: updated.updatedAt,
    };
  }

  // ------------------------------------------------------------------
  // 3. GUEST CRM
  // ------------------------------------------------------------------
  async listGuestsCrm(propertyId: string) {
    const guests = await prisma.guest.findMany({
      where: { propertyId },
      include: {
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { checkInDate: 'desc' },
          select: { id: true, totalAmount: true, checkInDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return guests.map((g) => {
      const spend = g.bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
      const last = g.bookings[0]?.checkInDate
        ? g.bookings[0].checkInDate.toISOString().split('T')[0]
        : g.createdAt.toISOString().split('T')[0];
      return {
        id: g.id,
        name: `${g.firstName} ${g.lastName || ''}`.trim(),
        email: g.email || '-',
        phone: g.phone || '-',
        idNumber: g.idNumber ? `${g.idNumber}${g.idType ? ` (${g.idType})` : ''}` : '-',
        vipStatus: (g.vipStatus === 'STANDARD' ? 'REGULAR' : g.vipStatus) as
          | 'VIP'
          | 'REGULAR'
          | 'BLACKLIST',
        totalStays: g.bookings.length,
        lifetimeSpend: spend,
        lastStay: last,
        notes: g.notes || '',
      };
    });
  }

  async createGuestCrm(propertyId: string, dto: CreateGuestCrmDto) {
    const parts = dto.fullName.trim().split(/\s+/);
    const created = await prisma.guest.create({
      data: {
        propertyId,
        firstName: parts[0] || 'Guest',
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        idType: dto.idType || 'KTP',
        idNumber: dto.idNumber?.trim() || null,
        vipStatus: dto.vipStatus || 'REGULAR',
        notes: dto.notes?.trim() || null,
      },
    });
    return created;
  }

  async updateGuestCrm(propertyId: string, guestId: string, dto: UpdateGuestCrmDto) {
    const guest = await prisma.guest.findFirst({ where: { id: guestId, propertyId } });
    if (!guest) throw new NotFoundException('Profil tamu tidak ditemukan.');

    return prisma.guest.update({
      where: { id: guest.id },
      data: {
        vipStatus: dto.vipStatus ?? guest.vipStatus,
        notes: dto.notes !== undefined ? dto.notes : guest.notes,
        phone: dto.phone !== undefined ? dto.phone : guest.phone,
        email: dto.email !== undefined ? dto.email : guest.email,
      },
    });
  }

  async mergeGuestsCrm(propertyId: string, dto: MergeGuestsDto) {
    if (dto.targetGuestId === dto.sourceGuestId) {
      throw new BadRequestException('Tamu sumber dan tujuan tidak boleh sama.');
    }
    return prisma.$transaction(async (tx) => {
      const target = await tx.guest.findFirst({
        where: { id: dto.targetGuestId, propertyId },
      });
      const source = await tx.guest.findFirst({
        where: { id: dto.sourceGuestId, propertyId },
      });
      if (!target || !source) throw new NotFoundException('Tamu tidak ditemukan.');

      await tx.booking.updateMany({
        where: { propertyId, primaryGuestId: source.id },
        data: { primaryGuestId: target.id },
      });

      const mergedNotes = [target.notes, source.notes]
        .filter(Boolean)
        .join(' | ');
      await tx.guest.update({
        where: { id: target.id },
        data: { notes: mergedNotes || null },
      });

      await tx.guest.delete({ where: { id: source.id } });
      return { merged: true, targetGuestId: target.id };
    });
  }

  // ------------------------------------------------------------------
  // 4. RATES & RATE PLANS MATRIX
  // ------------------------------------------------------------------
  async getRatesMatrix(propertyId: string) {
    const [roomTypes, ratePlans, matrix] = await Promise.all([
      prisma.roomType.findMany({
        where: { propertyId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.ratePlan.findMany({
        where: { propertyId, isActive: true },
        orderBy: { code: 'asc' },
      }),
      prisma.ratePlanRoom.findMany({
        where: { ratePlan: { propertyId } },
      }),
    ]);

    return {
      roomTypes: roomTypes.map((rt) => ({
        id: rt.id,
        code: rt.code,
        name: rt.name,
        totalRooms: rt.totalRooms,
      })),
      ratePlans: ratePlans.map((rp) => ({
        id: rp.id,
        code: rp.code,
        name: rp.name,
        description: rp.description || '',
      })),
      prices: matrix.map((m) => ({
        roomTypeId: m.roomTypeId,
        ratePlanId: m.ratePlanId,
        basePrice: Number(m.basePrice),
      })),
    };
  }

  async updateRatePrice(propertyId: string, dto: UpdateRatePriceDto) {
    const [rt, rp] = await Promise.all([
      prisma.roomType.findFirst({ where: { id: dto.roomTypeId, propertyId } }),
      prisma.ratePlan.findFirst({ where: { id: dto.ratePlanId, propertyId } }),
    ]);
    if (!rt || !rp) throw new NotFoundException('Tipe kamar atau rate plan tidak ditemukan.');

    return prisma.ratePlanRoom.upsert({
      where: { ratePlanId_roomTypeId: { ratePlanId: rp.id, roomTypeId: rt.id } },
      update: { basePrice: BigInt(Math.round(dto.basePrice)) },
      create: {
        ratePlanId: rp.id,
        roomTypeId: rt.id,
        basePrice: BigInt(Math.round(dto.basePrice)),
      },
    });
  }

  async createRatePlan(propertyId: string, dto: CreateRatePlanDto) {
    const code = dto.code.trim().toUpperCase();
    const clash = await prisma.ratePlan.findFirst({ where: { propertyId, code } });
    if (clash) throw new ConflictException(`Kode rate plan '${code}' sudah ada.`);

    return prisma.$transaction(async (tx) => {
      const rp = await tx.ratePlan.create({
        data: {
          propertyId,
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
        },
      });
      const rts = await tx.roomType.findMany({ where: { propertyId, isActive: true } });
      for (const rt of rts) {
        await tx.ratePlanRoom.create({
          data: { ratePlanId: rp.id, roomTypeId: rt.id, basePrice: BigInt(750000) },
        });
      }
      return rp;
    });
  }

  // ------------------------------------------------------------------
  // 5. CHANNEL MANAGER (AGODA & OTA)
  // ------------------------------------------------------------------
  async getChannelsOverview(propertyId: string) {
    let account = await prisma.channelAccount.findFirst({
      where: { propertyId, channelCode: 'AGODA' },
      include: {
        mappings: { include: { roomType: true, ratePlan: true } },
        syncLogs: { orderBy: { createdAt: 'desc' }, take: 25 },
      },
    });

    if (!account) {
      account = await prisma.channelAccount.create({
        data: {
          propertyId,
          channelCode: 'AGODA',
          credentialsEncrypted: 'SANDBOX-ENCRYPTED',
          isActive: true,
          isMock: true,
        },
        include: {
          mappings: { include: { roomType: true, ratePlan: true } },
          syncLogs: { orderBy: { createdAt: 'desc' }, take: 25 },
        },
      });
    }

    if (account.mappings.length === 0) {
      const rts = await prisma.roomType.findMany({ where: { propertyId, isActive: true } });
      const ro = await prisma.ratePlan.findFirst({ where: { propertyId } });
      if (ro && rts.length > 0) {
        for (const rt of rts) {
          await prisma.channelMapping.upsert({
            where: {
              channelAccountId_roomTypeId_ratePlanId: {
                channelAccountId: account.id,
                roomTypeId: rt.id,
                ratePlanId: ro.id,
              },
            },
            update: {},
            create: {
              channelAccountId: account.id,
              roomTypeId: rt.id,
              ratePlanId: ro.id,
              otaRoomCode: `AGD-RT-${rt.code}`,
              otaRatePlanCode: `AGD-RP-${ro.code}`,
            },
          });
        }
        account = (await prisma.channelAccount.findUnique({
          where: { id: account.id },
          include: {
            mappings: { include: { roomType: true, ratePlan: true } },
            syncLogs: { orderBy: { createdAt: 'desc' }, take: 25 },
          },
        }))!;
      }
    }

    return {
      account: {
        id: account.id,
        channelCode: account.channelCode,
        isActive: account.isActive,
        isMock: account.isMock,
        lastSyncAt: account.lastSyncAt,
      },
      mappings: account.mappings.map((m) => ({
        id: m.id,
        pmsRoomType: `${m.roomType.name} (${m.roomType.code})`,
        pmsRatePlan: m.ratePlan.name,
        otaRoomCode: m.otaRoomCode,
        otaRatePlanCode: m.otaRatePlanCode,
        rateMultiplier: Number(m.rateMultiplier),
        isActive: m.isActive,
      })),
      syncLogs: account.syncLogs.map((l) => ({
        id: l.id,
        channel: account!.channelCode,
        type: l.syncType,
        status: l.status,
        latencyMs: l.httpStatus === 200 ? 38 : 120,
        time: new Date(l.createdAt).toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour12: false,
        }) + ' WIB',
        requestPayload: l.requestPayload,
        responsePayload: l.responsePayload,
        error: l.errorMessage || undefined,
      })),
    };
  }

  async triggerChannelSync(propertyId: string, dto: TriggerChannelSyncDto) {
    const start = Date.now();
    const overview = await this.getChannelsOverview(propertyId);
    const syncType = dto.syncType || 'AVAILABILITY';
    const roomsCount = await prisma.room.count({ where: { propertyId } });

    const reqPayload = {
      propertyId,
      channel: overview.account.channelCode,
      syncType,
      mappingsCount: overview.mappings.length,
      totalPhysicalRooms: roomsCount,
      timestamp: new Date().toISOString(),
    };
    const resPayload = {
      status: 'Success',
      echoToken: `ACK-${Date.now()}`,
      syncedMappings: overview.mappings.length,
    };

    await prisma.channelSyncLog.create({
      data: {
        channelAccountId: overview.account.id,
        syncType,
        direction: syncType === 'RESERVATIONS_PULL' ? 'INBOUND' : 'OUTBOUND',
        status: 'SUCCESS',
        httpStatus: 200,
        requestPayload: reqPayload,
        responsePayload: resPayload,
      },
    });

    await prisma.channelAccount.update({
      where: { id: overview.account.id },
      data: { lastSyncAt: new Date() },
    });

    return this.getChannelsOverview(propertyId);
  }

  // ------------------------------------------------------------------
  // 6. REAL-TIME DASHBOARD ANALYTICS
  // ------------------------------------------------------------------
  async getDashboardAnalytics(propertyId: string) {
    const todayStr = this.getTodayJakartaDate();
    const todayStart = new Date(todayStr);
    const monthStart = new Date(`${todayStr.slice(0, 7)}-01`);

    const [rooms, bookings] = await Promise.all([
      prisma.room.findMany({ where: { propertyId } }),
      prisma.booking.findMany({
        where: { propertyId, status: { not: 'CANCELLED' } },
        include: {
          primaryGuest: true,
          bookingRooms: { include: { room: true, roomType: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalRooms = Math.max(1, rooms.length);
    const dirtyRooms = rooms.filter((r) => r.housekeepingStatus === 'DIRTY').length;
    const cleanRooms = rooms.filter(
      (r) => r.housekeepingStatus === 'CLEAN' || r.housekeepingStatus === 'INSPECTED'
    ).length;

    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    const arrivalsToday = bookings.filter(
      (b) => toDateStr(b.checkInDate) === todayStr && b.status === 'CONFIRMED'
    ).length;
    const departuresToday = bookings.filter(
      (b) => toDateStr(b.checkOutDate) === todayStr && b.status === 'CHECKED_IN'
    ).length;
    const inHouseCount = bookings.filter((b) => b.status === 'CHECKED_IN').length;

    // Rooms occupied today = IN_HOUSE or CONFIRMED covering todayStr
    const occupiedToday = bookings.filter(
      (b) =>
        b.status !== 'CHECKED_OUT' &&
        toDateStr(b.checkInDate) <= todayStr &&
        toDateStr(b.checkOutDate) > todayStr
    ).length;

    const occupancyPercent = Math.min(100, Math.round((occupiedToday / totalRooms) * 100));

    let revenueToday = 0;
    let revenueMtd = 0;
    let revenueTotal = 0;

    for (const b of bookings) {
      const amt = Number(b.totalAmount);
      revenueTotal += amt;
      if (b.checkInDate >= monthStart) {
        revenueMtd += amt;
      }
      if (toDateStr(b.checkInDate) <= todayStr && toDateStr(b.checkOutDate) > todayStr) {
        const nights = Math.max(
          1,
          Math.round((b.checkOutDate.getTime() - b.checkInDate.getTime()) / 86_400_000)
        );
        revenueToday += Math.round(amt / nights);
      }
    }

    const adr = occupiedToday > 0 ? Math.round(revenueToday / occupiedToday) : 0;
    const revpar = Math.round(revenueToday / totalRooms);

    // 7-day trend ending todayStr
    const pace7d: Array<{ date: string; revenue: number; occupancyRate: number; adr: number }> = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - offset);
      const dStr = toDateStr(d);
      const activeForDay = bookings.filter(
        (b) => toDateStr(b.checkInDate) <= dStr && toDateStr(b.checkOutDate) > dStr
      );
      const dayRev = activeForDay.reduce((sum, b) => {
        const n = Math.max(
          1,
          Math.round((b.checkOutDate.getTime() - b.checkInDate.getTime()) / 86_400_000)
        );
        return sum + Math.round(Number(b.totalAmount) / n);
      }, 0);
      const occ = Math.min(100, Math.round((activeForDay.length / totalRooms) * 100));
      pace7d.push({
        date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        revenue: dayRev,
        occupancyRate: occ,
        adr: activeForDay.length > 0 ? Math.round(dayRev / activeForDay.length) : 0,
      });
    }

    // Channel Share
    const sourceBuckets = new Map<string, { count: number; revenue: number }>();
    for (const b of bookings) {
      const src = (b.bookingSource || 'DIRECT').toUpperCase();
      const label =
        src === 'AGODA'
          ? 'Agoda (OTA)'
          : src === 'WALK_IN'
          ? 'Walk-In Desk'
          : src === 'CORPORATE'
          ? 'Corporate'
          : 'Direct Website / FIT';
      const prev = sourceBuckets.get(label) || { count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += Number(b.totalAmount);
      sourceBuckets.set(label, prev);
    }

    const palette = ['#0284c7', '#f43f5e', '#8b5cf6', '#059669', '#f59e0b'];
    const totalBkg = Math.max(1, bookings.length);
    const channelShare = Array.from(sourceBuckets.entries()).map(([name, val], idx) => ({
      name,
      value: Math.round((val.count / totalBkg) * 100),
      count: val.count,
      revenue: val.revenue,
      color: palette[idx % palette.length],
    }));

    return {
      todayDate: todayStr,
      totalRooms: rooms.length,
      cleanRooms,
      dirtyRooms,
      occupiedToday,
      occupancyPercent,
      arrivalsToday,
      departuresToday,
      inHouseCount,
      revenueToday,
      revenueMtd,
      revenueTotal,
      adr,
      revpar,
      pace7d,
      channelShare,
      recentBookings: bookings.slice(0, 6).map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        guestName: `${b.primaryGuest.firstName} ${b.primaryGuest.lastName || ''}`.trim(),
        roomNumber: b.bookingRooms[0]?.room?.roomNumber || '-',
        roomType: b.bookingRooms[0]?.roomType?.name || '-',
        source: b.bookingSource,
        status: b.status,
        checkInDate: toDateStr(b.checkInDate),
        checkOutDate: toDateStr(b.checkOutDate),
        totalAmount: Number(b.totalAmount),
      })),
    };
  }
}
