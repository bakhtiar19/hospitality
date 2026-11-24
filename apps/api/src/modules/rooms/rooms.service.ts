import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@hospitality/database';

export interface CreateRoomDto {
  roomNumber: string;
  floorId: string;
  roomTypeId: string;
  operationalStatus?: string;
  housekeepingStatus?: string;
  notes?: string;
}

export interface UpdateRoomDto {
  roomNumber?: string;
  floorId?: string;
  roomTypeId?: string;
  operationalStatus?: string;
  housekeepingStatus?: string;
  isClean?: boolean;
  notes?: string;
}

export interface BulkCreateRoomsDto {
  floorId: string;
  roomTypeId: string;
  startNumber: number;
  count: number;
  prefix?: string;
}

@Injectable()
export class RoomsService {
  async listRooms(propertyId: string, floorId?: string, roomTypeId?: string) {
    return prisma.room.findMany({
      where: {
        propertyId,
        ...(floorId ? { floorId } : {}),
        ...(roomTypeId ? { roomTypeId } : {}),
      },
      include: {
        floor: true,
        roomType: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async listFloors(propertyId: string) {
    return prisma.floor.findMany({
      where: { propertyId },
      include: {
        _count: { select: { rooms: true } },
      },
      orderBy: { floorNumber: 'asc' },
    });
  }

  async createFloor(propertyId: string, floorNumber: number, name: string) {
    return prisma.floor.create({
      data: {
        propertyId,
        floorNumber,
        name,
      },
    });
  }

  async createRoom(propertyId: string, dto: CreateRoomDto) {
    const existing = await prisma.room.findUnique({
      where: { propertyId_roomNumber: { propertyId, roomNumber: dto.roomNumber } },
    });
    if (existing) {
      throw new BadRequestException(`Room number '${dto.roomNumber}' already exists`);
    }

    return prisma.room.create({
      data: {
        propertyId,
        roomNumber: dto.roomNumber,
        floorId: dto.floorId,
        roomTypeId: dto.roomTypeId,
        operationalStatus: dto.operationalStatus || 'AVAILABLE',
        housekeepingStatus: dto.housekeepingStatus || 'CLEAN',
        notes: dto.notes,
      },
      include: { floor: true, roomType: true },
    });
  }

  async updateRoom(propertyId: string, id: string, dto: UpdateRoomDto) {
    const room = await prisma.room.findFirst({ where: { id, propertyId } });
    if (!room) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    return prisma.room.update({
      where: { id },
      data: dto,
      include: { floor: true, roomType: true },
    });
  }

  async bulkCreateRooms(propertyId: string, dto: BulkCreateRoomsDto) {
    const created = [];
    for (let i = 0; i < dto.count; i++) {
      const roomNum = `${dto.prefix || ''}${dto.startNumber + i}`;
      const room = await prisma.room.upsert({
        where: { propertyId_roomNumber: { propertyId, roomNumber: roomNum } },
        update: {},
        create: {
          propertyId,
          roomNumber: roomNum,
          floorId: dto.floorId,
          roomTypeId: dto.roomTypeId,
        },
      });
      created.push(room);
    }
    return { count: created.length, rooms: created };
  }
}
