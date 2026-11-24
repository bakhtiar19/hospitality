import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@hospitality/database';

@Injectable()
export class PropertiesService {
  async listProperties() {
    return prisma.property.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        timezone: true,
        defaultCurrency: true,
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
}
