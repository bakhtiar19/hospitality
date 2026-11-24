import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@hospitality/database';
import { EventsGateway } from '../websocket/events.gateway.js';

export interface UpdateRoomCleanlinessDto {
  housekeepingStatus: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'TOUCH_UP';
  isClean?: boolean;
}

export interface CreateMaintenanceTicketDto {
  roomId: string;
  issueDescription: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class HousekeepingService {
  constructor(private readonly eventsGateway: EventsGateway) {}

  async getBoard(propertyId: string) {
    return prisma.room.findMany({
      where: { propertyId },
      include: {
        floor: true,
        roomType: true,
        housekeepingTasks: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }],
    });
  }

  async updateRoomStatus(propertyId: string, roomId: string, dto: UpdateRoomCleanlinessDto) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, propertyId },
    });

    if (!room) {
      throw new NotFoundException(`Room '${roomId}' not found`);
    }

    const isClean = dto.isClean ?? (dto.housekeepingStatus === 'CLEAN' || dto.housekeepingStatus === 'INSPECTED');

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: {
        housekeepingStatus: dto.housekeepingStatus,
        isClean,
      },
    });

    this.eventsGateway.broadcastHousekeepingUpdate(propertyId, {
      roomId,
      roomNumber: updated.roomNumber,
      housekeepingStatus: updated.housekeepingStatus,
      isClean: updated.isClean,
    });

    return updated;
  }

  async getTasks(propertyId: string, assignedTo?: string) {
    return prisma.housekeepingTask.findMany({
      where: {
        propertyId,
        ...(assignedTo ? { assignedTo } : {}),
      },
      include: {
        room: { include: { floor: true, roomType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeTask(propertyId: string, taskId: string) {
    const task = await prisma.housekeepingTask.findFirst({
      where: { id: taskId, propertyId },
    });

    if (!task) {
      throw new NotFoundException(`Task '${taskId}' not found`);
    }

    const updatedTask = await prisma.housekeepingTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Mark room as inspected/clean
    await prisma.room.update({
      where: { id: task.roomId },
      data: {
        housekeepingStatus: 'INSPECTED',
        isClean: true,
      },
    });

    return updatedTask;
  }
}
