import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { prisma } from '@hospitality/database';
import {
  CreateStaffDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterHotelDto,
} from './auth.dto.js';
import { LoginResponseDto, PermissionCode, UserPayload, UserRole } from '@hospitality/shared-types';
import { getJwtAccessSecret, getJwtRefreshSecret } from '../../common/config/security.config.js';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(_dto: RegisterDto): Promise<{ id: string; email: string }> {
    throw new BadRequestException(
      'Public user registration into existing hotels is disabled. Ask your hotel OWNER to invite you, or register a new hotel via /auth/register-hotel.'
    );
  }

  /**
   * SaaS Multi-Tenant Hotel Onboarding:
   * Atomically provisions a new Property, Roles & Permissions, Taxes, Default Floors/RoomTypes/Rooms,
   * Rate Plans, and the initial OWNER account.
   */
  async registerHotel(
    dto: RegisterHotelDto
  ): Promise<LoginResponseDto | { pendingApproval: true; property: { id: string; code: string; name: string }; message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar. Silakan login atau gunakan email lain.');
    }

    const autoActivate =
      process.env.NODE_ENV !== 'production' || process.env.ALLOW_PUBLIC_AUTO_ACTIVATE === 'true';

    const baseCode = (dto.propertyCode || dto.hotelName)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);

    const uniqueCode = `${baseCode || 'HOTEL'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const created = await prisma.$transaction(async (tx) => {
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
          isActive: autoActivate,
        },
      });

      // Default Taxes
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

      // Ensure global permissions exist, or read existing
      const allPerms = await tx.permission.findMany();

      const ownerRole = await tx.role.create({
        data: {
          propertyId: property.id,
          name: 'OWNER',
          description: 'Pemilik Hotel (Akses Penuh)',
          isSystem: true,
        },
      });

      const managerRole = await tx.role.create({
        data: {
          propertyId: property.id,
          name: 'MANAGER',
          description: 'Hotel Manager',
          isSystem: true,
        },
      });

      const frontDeskRole = await tx.role.create({
        data: {
          propertyId: property.id,
          name: 'FRONT_DESK',
          description: 'Resepsionis / Front Office',
          isSystem: true,
        },
      });

      const hkRole = await tx.role.create({
        data: {
          propertyId: property.id,
          name: 'HOUSEKEEPING',
          description: 'Housekeeping Staff',
          isSystem: true,
        },
      });

      const accRole = await tx.role.create({
        data: {
          propertyId: property.id,
          name: 'ACCOUNTANT',
          description: 'Finance & Back Office',
          isSystem: true,
        },
      });

      if (allPerms.length > 0) {
        await tx.rolePermission.createMany({
          data: allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
        await tx.rolePermission.createMany({
          data: allPerms
            .filter((p) => p.code !== 'tax:manage')
            .map((p) => ({ roleId: managerRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
        await tx.rolePermission.createMany({
          data: allPerms
            .filter((p) =>
              [
                'property:read',
                'booking:read',
                'booking:create',
                'booking:update',
                'front_desk:checkin',
                'front_desk:checkout',
                'folio:charge',
                'folio:payment',
                'housekeeping:view',
              ].includes(p.code)
            )
            .map((p) => ({ roleId: frontDeskRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
        await tx.rolePermission.createMany({
          data: allPerms
            .filter((p) => ['housekeeping:view', 'housekeeping:update'].includes(p.code))
            .map((p) => ({ roleId: hkRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
        await tx.rolePermission.createMany({
          data: allPerms
            .filter((p) =>
              ['property:read', 'booking:read', 'folio:payment', 'reports:view', 'finance:view'].includes(p.code)
            )
            .map((p) => ({ roleId: accRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }

      // Starter Floors, RoomTypes, Rooms & RatePlans so the hotel can operate immediately
      const floor1 = await tx.floor.create({
        data: { propertyId: property.id, floorNumber: 1, name: 'Lantai 1' },
      });
      const floor2 = await tx.floor.create({
        data: { propertyId: property.id, floorNumber: 2, name: 'Lantai 2' },
      });

      const supType = await tx.roomType.create({
        data: {
          propertyId: property.id,
          code: 'SUP',
          name: 'Superior Room',
          totalRooms: 5,
          baseOccupancy: 2,
          maxOccupancy: 2,
        },
      });
      const dlxType = await tx.roomType.create({
        data: {
          propertyId: property.id,
          code: 'DLX',
          name: 'Deluxe Room',
          totalRooms: 5,
          baseOccupancy: 2,
          maxOccupancy: 3,
        },
      });

      const rpRoomOnly = await tx.ratePlan.create({
        data: { propertyId: property.id, code: 'RO', name: 'Room Only', description: 'Kamar Saja' },
      });
      const rpBb = await tx.ratePlan.create({
        data: {
          propertyId: property.id,
          code: 'BB',
          name: 'Bed & Breakfast',
          description: 'Termasuk Sarapan',
        },
      });

      await tx.ratePlanRoom.createMany({
        data: [
          { ratePlanId: rpRoomOnly.id, roomTypeId: supType.id, basePrice: BigInt(650000) },
          { ratePlanId: rpRoomOnly.id, roomTypeId: dlxType.id, basePrice: BigInt(880000) },
          { ratePlanId: rpBb.id, roomTypeId: supType.id, basePrice: BigInt(750000) },
          { ratePlanId: rpBb.id, roomTypeId: dlxType.id, basePrice: BigInt(980000) },
        ],
      });

      const starterRooms = [
        ...['101', '102', '103', '104', '105'].map((num) => ({
          propertyId: property.id,
          roomTypeId: supType.id,
          floorId: floor1.id,
          roomNumber: num,
          housekeepingStatus: 'CLEAN',
        })),
        ...['201', '202', '203', '204', '205'].map((num) => ({
          propertyId: property.id,
          roomTypeId: dlxType.id,
          floorId: floor2.id,
          roomNumber: num,
          housekeepingStatus: 'CLEAN',
        })),
      ];
      await tx.room.createMany({ data: starterRooms });

      // Owner User
      const ownerUser = await tx.user.create({
        data: {
          propertyId: property.id,
          email: normalizedEmail,
          passwordHash,
          fullName: dto.ownerName.trim(),
          phone: dto.phone?.trim() || null,
          isActive: true,
        },
      });

      await tx.userRole.create({
        data: { userId: ownerUser.id, roleId: ownerRole.id },
      });

      return { property, ownerUser, permissions: allPerms.map((p) => p.code) };
    });

    if (!autoActivate) {
      return {
        pendingApproval: true,
        property: {
          id: created.property.id,
          code: created.property.code,
          name: created.property.name,
        },
        message:
          'Pendaftaran properti berhasil dikirim! Akun hotel Anda sedang menunggu persetujuan & aktivasi dari Admin AProject.',
      };
    }

    const payload: UserPayload = {
      sub: created.ownerUser.id,
      email: created.ownerUser.email,
      role: UserRole.OWNER,
      propertyId: created.property.id,
      permissions: created.permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: created.ownerUser.id, tokenType: 'refresh' },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: created.ownerUser.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        ...payload,
        fullName: created.ownerUser.fullName,
        propertyName: created.property.name,
      },
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        property: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive || (!user.isSuperAdmin && !user.property.isActive)) {
      throw new UnauthorizedException('Email atau password salah atau akun/hotel dinonaktifkan');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // Resolve primary role and granular permissions
    const isSuperAdmin = Boolean(user.isSuperAdmin);
    const primaryRole = isSuperAdmin
      ? UserRole.SUPER_ADMIN
      : (user.userRoles[0]?.role?.name as UserRole) || UserRole.FRONT_DESK;
    const permissions: string[] = isSuperAdmin ? Object.values(PermissionCode) : [];
    if (!isSuperAdmin) {
      user.userRoles.forEach((ur) => {
        ur.role.rolePermissions.forEach((rp) => {
          if (!permissions.includes(rp.permission.code)) {
            permissions.push(rp.permission.code);
          }
        });
      });
    }

    const payload: UserPayload = {
      sub: user.id,
      email: user.email,
      role: primaryRole,
      propertyId: user.propertyId,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenType: 'refresh' },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        ...payload,
        fullName: user.fullName,
        propertyName: user.property.name,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: { sub: string; tokenType: string };
    try {
      decoded = this.jwtService.verify(dto.refreshToken, {
        secret: getJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (decoded.tokenType !== 'refresh') {
      throw new UnauthorizedException('Token is not a valid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('User no longer active or refresh revoked');
    }

    const isTokenValid = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
    if (!isTokenValid) {
      // Possible token reuse detected - invalidate stored refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Refresh token reuse detected. Please login again.');
    }

    const isSuperAdmin = Boolean(user.isSuperAdmin);
    const primaryRole = isSuperAdmin
      ? UserRole.SUPER_ADMIN
      : (user.userRoles[0]?.role?.name as UserRole) || UserRole.FRONT_DESK;
    const permissions: string[] = isSuperAdmin ? Object.values(PermissionCode) : [];
    if (!isSuperAdmin) {
      user.userRoles.forEach((ur) => {
        ur.role.rolePermissions.forEach((rp) => {
          if (!permissions.includes(rp.permission.code)) {
            permissions.push(rp.permission.code);
          }
        });
      });
    }

    const payload: UserPayload = {
      sub: user.id,
      email: user.email,
      role: primaryRole,
      propertyId: user.propertyId,
      permissions,
    };

    const newAccessToken = this.jwtService.sign(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, tokenType: 'refresh' },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    );

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string): Promise<boolean> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return true;
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        propertyId: true,
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            timezone: true,
            defaultCurrency: true,
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                        module: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Lists staff scoped strictly to the tenant propertyId (never returns credentials).
   */
  async listStaff(propertyId: string) {
    const users = await prisma.user.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: { id: true, name: true, description: true },
            },
          },
        },
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      role: u.userRoles[0]?.role?.name || 'FRONT_DESK',
    }));
  }

  /**
   * Allows hotel OWNER / MANAGER to create staff within their own hotel property.
   */
  async createStaff(propertyId: string, dto: CreateStaffDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email sudah digunakan akun lain.');
    }

    let roleRecord = await prisma.role.findFirst({
      where: { propertyId, name: dto.role },
    });
    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: {
          propertyId,
          name: dto.role,
          description: `${dto.role} staff role`,
          isSystem: true,
        },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await prisma.user.create({
      data: {
        propertyId,
        email: normalizedEmail,
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        isActive: true,
        userRoles: {
          create: { roleId: roleRecord.id },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { ...created, role: roleRecord.name };
  }

  async updateStaffStatus(
    propertyId: string,
    targetUserId: string,
    actingUserId: string,
    isActive: boolean
  ) {
    if (targetUserId === actingUserId && !isActive) {
      throw new BadRequestException('Tidak dapat menonaktifkan akun Anda sendiri.');
    }
    const target = await prisma.user.findFirst({
      where: { id: targetUserId, propertyId },
    });
    if (!target) {
      throw new NotFoundException('Staff tidak ditemukan pada properti ini.');
    }

    return prisma.user.update({
      where: { id: target.id },
      data: {
        isActive,
        refreshTokenHash: isActive ? target.refreshTokenHash : null,
      },
      select: { id: true, email: true, fullName: true, isActive: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan.');
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Password saat ini tidak sesuai.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, refreshTokenHash: null },
    });
    return { updated: true };
  }

  async resetStaffPassword(propertyId: string, targetUserId: string, newPassword: string) {
    const target = await prisma.user.findFirst({
      where: { id: targetUserId, propertyId, isSuperAdmin: false },
    });
    if (!target) {
      throw new NotFoundException('Akun staf tidak ditemukan pada properti ini.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, refreshTokenHash: null },
    });
    return { updated: true, email: target.email };
  }
}
