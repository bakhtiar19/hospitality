import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { prisma } from '@hospitality/database';
import { LoginDto, RefreshTokenDto, RegisterDto } from './auth.dto.js';
import { LoginResponseDto, UserPayload, UserRole } from '@hospitality/shared-types';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        propertyId: dto.propertyId,
      },
    });

    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Resolve primary role and granular permissions
    const primaryRole = (user.userRoles[0]?.role?.name as UserRole) || UserRole.FRONT_DESK;
    const permissions: string[] = [];
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        if (!permissions.includes(rp.permission.code)) {
          permissions.push(rp.permission.code);
        }
      });
    });

    const payload: UserPayload = {
      sub: user.id,
      email: user.email,
      role: primaryRole,
      propertyId: user.propertyId,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'super-secret-jwt-access-key-change-in-production-2026',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenType: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-change-in-production-2026',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }
    );

    // Store hashed refresh token in database for rotation security
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
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-change-in-production-2026',
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

    const primaryRole = (user.userRoles[0]?.role?.name as UserRole) || UserRole.FRONT_DESK;
    const permissions: string[] = [];
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        if (!permissions.includes(rp.permission.code)) {
          permissions.push(rp.permission.code);
        }
      });
    });

    const payload: UserPayload = {
      sub: user.id,
      email: user.email,
      role: primaryRole,
      propertyId: user.propertyId,
      permissions,
    };

    // Issue rotated tokens
    const newAccessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'super-secret-jwt-access-key-change-in-production-2026',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, tokenType: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-change-in-production-2026',
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
}
