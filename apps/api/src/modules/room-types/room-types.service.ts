import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@hospitality/database';

export interface CreateRoomTypeDto {
  code: string;
  name: string;
  description?: string;
  totalRooms?: number;
  baseOccupancy?: number;
  maxOccupancy?: number;
  amenities?: string[];
  photos?: string[];
}

export interface UpdateRoomTypeDto {
  name?: string;
  description?: string;
  totalRooms?: number;
  baseOccupancy?: number;
  maxOccupancy?: number;
  amenities?: string[];
  photos?: string[];
  isActive?: boolean;
}

@Injectable()
export class RoomTypesService {
  async list(propertyId: string) {
    return prisma.roomType.findMany({
      where: { propertyId },
      include: {
        _count: {
          select: { rooms: true },
        },
        ratePlanRooms: {
          include: {
            ratePlan: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getById(propertyId: string, id: string) {
    const roomType = await prisma.roomType.findFirst({
      where: { id, propertyId },
      include: {
        rooms: {
          include: { floor: true },
        },
        ratePlanRooms: {
          include: { ratePlan: true },
        },
      },
    });
    if (!roomType) {
      throw new NotFoundException(`Room type '${id}' not found`);
    }
    return roomType;
  }

  async create(propertyId: string, dto: CreateRoomTypeDto) {
    const existing = await prisma.roomType.findUnique({
      where: { propertyId_code: { propertyId, code: dto.code } },
    });
    if (existing) {
      throw new BadRequestException(`Room type code '${dto.code}' already exists`);
    }

    return prisma.roomType.create({
      data: {
        propertyId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        totalRooms: dto.totalRooms ?? 0,
        baseOccupancy: dto.baseOccupancy ?? 2,
        maxOccupancy: dto.maxOccupancy ?? 3,
        amenities: dto.amenities ?? [],
        photos: dto.photos ?? [],
      },
    });
  }

  async update(propertyId: string, id: string, dto: UpdateRoomTypeDto) {
    await this.getById(propertyId, id);
    return prisma.roomType.update({
      where: { id },
      data: dto,
    });
  }

  async delete(propertyId: string, id: string) {
    await this.getById(propertyId, id);
    return prisma.roomType.delete({ where: { id } });
  }
}
