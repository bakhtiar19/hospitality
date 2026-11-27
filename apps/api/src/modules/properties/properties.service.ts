import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { prisma } from '@hospitality/database';

@Injectable()
export class PropertiesService {
  async listPropertyScoped(propertyId: string) {
    return prisma.property.findMany({
      where: { id: propertyId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        address: true,
        timezone: true,
        defaultCurrency: true,
        settings: true,
        _count: {
          select: {
            rooms: true,
            roomTypes: true,
          },
        },
      },
    });
  }

  async getProperty(idOrCode: string) {
    const property = await prisma.property.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      include: {
        taxConfigs: {
          where: { isActive: true },
          orderBy: { calculationOrder: 'asc' },
        },
        roomTypes: {
          where: { isActive: true },
        },
        floors: {
          orderBy: { floorNumber: 'asc' },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property '${idOrCode}' not found`);
    }

    return property;
  }

  async updatePropertySettings(propertyId: string, payload: Record<string, unknown>) {
    const existing = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!existing) {
      throw new NotFoundException('Property not found');
    }

    const logoUrl = typeof payload.logoUrl === 'string' ? payload.logoUrl : undefined;
    if (logoUrl && logoUrl.length > 0) {
      if (!logoUrl.startsWith('data:image/') && !logoUrl.startsWith('https://')) {
        throw new BadRequestException('Format logo tidak valid (gunakan gambar PNG/JPG/WebP/SVG).');
      }
      if (logoUrl.length > 450_000) {
        throw new BadRequestException('Ukuran file logo terlalu besar (maks 300KB setelah encode).');
      }
    }

    const prevSettings = (existing.settings as Record<string, unknown>) || {};
    const mergedSettings = {
      ...prevSettings,
      phone: typeof payload.phone === 'string' ? payload.phone : prevSettings.phone,
      email: typeof payload.email === 'string' ? payload.email : prevSettings.email,
      npwpd: typeof payload.npwpd === 'string' ? payload.npwpd : prevSettings.npwpd,
      logoUrl: logoUrl !== undefined ? logoUrl : prevSettings.logoUrl,
      checkInTime: typeof payload.checkInTime === 'string' ? payload.checkInTime : prevSettings.checkInTime,
      checkOutTime: typeof payload.checkOutTime === 'string' ? payload.checkOutTime : prevSettings.checkOutTime,
      pbjtRate:
        typeof payload.pbjtRate === 'number'
          ? Math.max(0, Math.min(100, payload.pbjtRate))
          : prevSettings.pbjtRate ?? 10,
      serviceChargeRate:
        typeof payload.serviceChargeRate === 'number'
          ? Math.max(0, Math.min(100, payload.serviceChargeRate))
          : prevSettings.serviceChargeRate ?? 10,
      pbjtEnabled:
        typeof payload.pbjtEnabled === 'boolean'
          ? payload.pbjtEnabled
          : prevSettings.pbjtEnabled ?? true,
      serviceChargeEnabled:
        typeof payload.serviceChargeEnabled === 'boolean'
          ? payload.serviceChargeEnabled
          : prevSettings.serviceChargeEnabled ?? true,
    };

    return prisma.property.update({
      where: { id: propertyId },
      data: {
        name: typeof payload.hotelName === 'string' && payload.hotelName.trim() ? payload.hotelName.trim() : existing.name,
        city: typeof payload.city === 'string' && payload.city.trim() ? payload.city.trim() : existing.city,
        address: typeof payload.address === 'string' ? payload.address : existing.address,
        settings: mergedSettings as object,
      },
    });
  }

  /**
   * Super Admin only: list ALL connected client hotel properties on the platform.
   */
  async listAllConnectedPropertiesForAdmin() {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        address: true,
        isActive: true,
        createdAt: true,
        settings: true,
        _count: {
          select: {
            rooms: true,
            bookings: true,
            users: true,
          },
        },
        users: {
          where: { isSuperAdmin: false },
          take: 3,
          orderBy: { createdAt: 'asc' },
          select: {
            fullName: true,
            email: true,
            phone: true,
            userRoles: {
              select: { role: { select: { name: true } } },
            },
          },
        },
      },
    });

    return properties.map((p) => {
      const owner =
        p.users.find((u) => u.userRoles.some((ur) => ur.role.name === 'OWNER')) || p.users[0];
      const s = (p.settings as Record<string, any>) || {};
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        city: p.city,
        address: p.address,
        phone: s.phone || owner?.phone || '-',
        isActive: p.isActive,
        createdAt: p.createdAt,
        ownerName: owner?.fullName || '-',
        ownerEmail: owner?.email || '-',
        roomsCount: p._count.rooms,
        bookingsCount: p._count.bookings,
        usersCount: p._count.users,
      };
    });
  }

  async updatePropertyStatusForAdmin(propertyId: string, isActive: boolean) {
    const existing = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!existing) {
      throw new NotFoundException('Properti hotel tidak ditemukan.');
    }
    return prisma.property.update({
      where: { id: propertyId },
      data: { isActive },
      select: { id: true, code: true, name: true, isActive: true },
    });
  }

  async createClientHotelForAdmin(dto: {
    hotelName: string;
    city: string;
    address?: string;
    phone?: string;
    ownerName: string;
    email: string;
    password: string;
    superiorRooms?: number;
    deluxeRooms?: number;
  }) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ConflictException('Email owner sudah terdaftar pada akun lain.');
    }

    const baseCode = dto.hotelName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const uniqueCode = `${baseCode || 'HOTEL'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const supCount = Math.max(1, Math.min(50, dto.superiorRooms ?? 5));
    const dlxCount = Math.max(0, Math.min(50, dto.deluxeRooms ?? 5));

    return prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          code: uniqueCode,
          name: dto.hotelName.trim(),
          city: dto.city.trim(),
          address: dto.address?.trim() || `${dto.city.trim()}, Indonesia`,
          timezone: 'Asia/Jakarta',
          defaultCurrency: 'IDR',
          settings: {
            phone: dto.phone?.trim() || '+62',
            email: normalizedEmail,
            npwpd: '',
            logoUrl: '',
            checkInTime: '14:00 WIB',
            checkOutTime: '12:00 WIB',
            pbjtRate: 10,
            serviceChargeRate: 10,
            pbjtEnabled: true,
            serviceChargeEnabled: true,
          },
          isActive: true,
        },
      });

      await tx.taxConfiguration.createMany({
        data: [
          {
            propertyId: property.id,
            code: 'SERVICE-CHARGE',
            name: 'Hotel Service Charge',
            ratePercentage: 10.0,
            calculationOrder: 1,
            isInclusive: false,
            isActive: true,
          },
          {
            propertyId: property.id,
            code: 'PBJT-HOTEL',
            name: `PBJT Jasa Perhotelan ${dto.city.trim()}`,
            ratePercentage: 10.0,
            calculationOrder: 2,
            isInclusive: false,
            isActive: true,
          },
        ],
      });

      const allPerms = await tx.permission.findMany();
      const ownerRole = await tx.role.create({
        data: { propertyId: property.id, name: 'OWNER', description: 'Pemilik Hotel', isSystem: true },
      });
      for (const rName of ['MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT']) {
        await tx.role.create({
          data: { propertyId: property.id, name: rName, description: `${rName} Role`, isSystem: true },
        });
      }
      if (allPerms.length > 0) {
        await tx.rolePermission.createMany({
          data: allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }

      const floor1 = await tx.floor.create({
        data: { propertyId: property.id, floorNumber: 1, name: 'Lantai 1' },
      });
      const supType = await tx.roomType.create({
        data: {
          propertyId: property.id,
          code: 'SUP',
          name: 'Superior Room',
          totalRooms: supCount,
          baseOccupancy: 2,
          maxOccupancy: 2,
        },
      });
      const rpRo = await tx.ratePlan.create({
        data: { propertyId: property.id, code: 'RO', name: 'Room Only', description: 'Kamar Saja' },
      });
      const rpBb = await tx.ratePlan.create({
        data: { propertyId: property.id, code: 'BB', name: 'Bed & Breakfast', description: 'Termasuk Sarapan' },
      });
      await tx.ratePlanRoom.createMany({
        data: [
          { ratePlanId: rpRo.id, roomTypeId: supType.id, basePrice: BigInt(650000) },
          { ratePlanId: rpBb.id, roomTypeId: supType.id, basePrice: BigInt(750000) },
        ],
      });

      const supRooms = Array.from({ length: supCount }, (_, i) => ({
        propertyId: property.id,
        roomTypeId: supType.id,
        floorId: floor1.id,
        roomNumber: String(101 + i),
        housekeepingStatus: 'CLEAN',
      }));
      await tx.room.createMany({ data: supRooms });

      if (dlxCount > 0) {
        const floor2 = await tx.floor.create({
          data: { propertyId: property.id, floorNumber: 2, name: 'Lantai 2' },
        });
        const dlxType = await tx.roomType.create({
          data: {
            propertyId: property.id,
            code: 'DLX',
            name: 'Deluxe Room',
            totalRooms: dlxCount,
            baseOccupancy: 2,
            maxOccupancy: 3,
          },
        });
        await tx.ratePlanRoom.createMany({
          data: [
            { ratePlanId: rpRo.id, roomTypeId: dlxType.id, basePrice: BigInt(880000) },
            { ratePlanId: rpBb.id, roomTypeId: dlxType.id, basePrice: BigInt(980000) },
          ],
        });
        const dlxRooms = Array.from({ length: dlxCount }, (_, i) => ({
          propertyId: property.id,
          roomTypeId: dlxType.id,
          floorId: floor2.id,
          roomNumber: String(201 + i),
          housekeepingStatus: 'CLEAN',
        }));
        await tx.room.createMany({ data: dlxRooms });
      }

      const ownerUser = await tx.user.create({
        data: {
          propertyId: property.id,
          email: normalizedEmail,
          passwordHash,
          fullName: dto.ownerName.trim(),
          phone: dto.phone?.trim() || null,
          isActive: true,
          userRoles: { create: { roleId: ownerRole.id } },
        },
        select: { id: true, email: true, fullName: true },
      });

      return {
        property: { id: property.id, code: property.code, name: property.name, city: property.city },
        owner: ownerUser,
        totalRooms: supCount + dlxCount,
      };
    });
  }

  async resetOwnerPasswordForAdmin(propertyId: string, newPassword: string) {
    const owner = await prisma.user.findFirst({
      where: {
        propertyId,
        isSuperAdmin: false,
        userRoles: { some: { role: { name: 'OWNER' } } },
      },
    });
    if (!owner) {
      throw new NotFoundException('Akun Owner tidak ditemukan pada hotel ini.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: owner.id },
      data: { passwordHash, refreshTokenHash: null },
    });
    return { updated: true, ownerEmail: owner.email };
  }
}
