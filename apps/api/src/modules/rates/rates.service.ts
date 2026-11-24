import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@hospitality/database';

export interface CreateRatePlanDto {
  code: string;
  name: string;
  description?: string;
  isDerived?: boolean;
  taxIds?: string[];
}

export interface UpdateRatePlanDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  taxIds?: string[];
}

@Injectable()
export class RatesService {
  async listRatePlans(propertyId: string) {
    return prisma.ratePlan.findMany({
      where: { propertyId },
      include: {
        ratePlanTaxes: {
          include: { taxConfiguration: true },
        },
        ratePlanRooms: {
          include: {
            roomType: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getRatePlan(propertyId: string, id: string) {
    const plan = await prisma.ratePlan.findFirst({
      where: { id, propertyId },
      include: {
        ratePlanTaxes: {
          include: { taxConfiguration: true },
        },
        ratePlanRooms: {
          include: { roomType: true },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException(`Rate plan '${id}' not found`);
    }
    return plan;
  }

  async createRatePlan(propertyId: string, dto: CreateRatePlanDto) {
    const existing = await prisma.ratePlan.findUnique({
      where: { propertyId_code: { propertyId, code: dto.code } },
    });
    if (existing) {
      throw new BadRequestException(`Rate plan code '${dto.code}' already exists`);
    }

    const plan = await prisma.ratePlan.create({
      data: {
        propertyId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isDerived: dto.isDerived ?? false,
      },
    });

    if (dto.taxIds && dto.taxIds.length > 0) {
      for (const taxId of dto.taxIds) {
        await prisma.ratePlanTax.create({
          data: {
            ratePlanId: plan.id,
            taxConfigurationId: taxId,
          },
        });
      }
    }

    return plan;
  }

  async updateRatePlan(propertyId: string, id: string, dto: UpdateRatePlanDto) {
    await this.getRatePlan(propertyId, id);

    const updated = await prisma.ratePlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });

    if (dto.taxIds) {
      await prisma.ratePlanTax.deleteMany({ where: { ratePlanId: id } });
      for (const taxId of dto.taxIds) {
        await prisma.ratePlanTax.create({
          data: {
            ratePlanId: id,
            taxConfigurationId: taxId,
          },
        });
      }
    }

    return updated;
  }

  async setRoomBasePrice(
    propertyId: string,
    ratePlanId: string,
    roomTypeId: string,
    basePrice: bigint,
    currency: string = 'IDR'
  ) {
    await this.getRatePlan(propertyId, ratePlanId);

    return prisma.ratePlanRoom.upsert({
      where: {
        ratePlanId_roomTypeId: { ratePlanId, roomTypeId },
      },
      update: {
        basePrice,
        currency,
      },
      create: {
        ratePlanId,
        roomTypeId,
        basePrice,
        currency,
      },
    });
  }

  async getRateMatrix(propertyId: string, startDateStr: string, endDateStr: string) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const [roomTypes, ratePlans, restrictions] = await Promise.all([
      prisma.roomType.findMany({
        where: { propertyId, isActive: true },
        select: { id: true, code: true, name: true, totalRooms: true },
      }),
      prisma.ratePlan.findMany({
        where: { propertyId, isActive: true },
        include: {
          ratePlanRooms: true,
          ratePlanTaxes: { include: { taxConfiguration: true } },
        },
      }),
      prisma.rateRestrictionLedger.findMany({
        where: {
          propertyId,
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      propertyId,
      dateRange: { start: startDateStr, end: endDateStr },
      roomTypes,
      ratePlans,
      restrictions,
    };
  }
}
