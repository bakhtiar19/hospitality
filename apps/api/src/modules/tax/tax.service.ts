import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@hospitality/database';

export interface TaxCalculationDetail {
  taxId: string;
  code: string;
  name: string;
  ratePercentage: number;
  amount: bigint;
  isInclusive: boolean;
}

export interface TaxCalculationResult {
  baseAmount: bigint;
  netAmount: bigint;
  totalTaxAmount: bigint;
  grossAmount: bigint;
  currency: string;
  details: TaxCalculationDetail[];
}

export interface CreateTaxDto {
  code: string;
  name: string;
  ratePercentage: number;
  calculationOrder?: number;
  isInclusive?: boolean;
  ratePlanIds?: string[];
}

export interface UpdateTaxDto {
  name?: string;
  ratePercentage?: number;
  calculationOrder?: number;
  isInclusive?: boolean;
  isActive?: boolean;
  ratePlanIds?: string[];
}

@Injectable()
export class TaxService {
  async getTaxes(propertyId: string) {
    return prisma.taxConfiguration.findMany({
      where: { propertyId },
      orderBy: { calculationOrder: 'asc' },
      include: {
        ratePlanTaxes: {
          include: {
            ratePlan: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });
  }

  async createTax(propertyId: string, dto: CreateTaxDto) {
    const existing = await prisma.taxConfiguration.findUnique({
      where: { propertyId_code: { propertyId, code: dto.code } },
    });
    if (existing) {
      throw new BadRequestException(`Tax code '${dto.code}' already exists for this property`);
    }

    const tax = await prisma.taxConfiguration.create({
      data: {
        propertyId,
        code: dto.code,
        name: dto.name,
        ratePercentage: dto.ratePercentage,
        calculationOrder: dto.calculationOrder ?? 1,
        isInclusive: dto.isInclusive ?? false,
      },
    });

    if (dto.ratePlanIds && dto.ratePlanIds.length > 0) {
      for (const rpId of dto.ratePlanIds) {
        await prisma.ratePlanTax.create({
          data: {
            ratePlanId: rpId,
            taxConfigurationId: tax.id,
          },
        });
      }
    }

    return tax;
  }

  async updateTax(propertyId: string, id: string, dto: UpdateTaxDto) {
    const tax = await prisma.taxConfiguration.findFirst({
      where: { id, propertyId },
    });
    if (!tax) {
      throw new NotFoundException(`Tax configuration '${id}' not found`);
    }

    const updated = await prisma.taxConfiguration.update({
      where: { id },
      data: {
        name: dto.name,
        ratePercentage: dto.ratePercentage,
        calculationOrder: dto.calculationOrder,
        isInclusive: dto.isInclusive,
        isActive: dto.isActive,
      },
    });

    if (dto.ratePlanIds) {
      await prisma.ratePlanTax.deleteMany({
        where: { taxConfigurationId: id },
      });
      for (const rpId of dto.ratePlanIds) {
        await prisma.ratePlanTax.create({
          data: {
            ratePlanId: rpId,
            taxConfigurationId: id,
          },
        });
      }
    }

    return updated;
  }

  async deleteTax(propertyId: string, id: string) {
    const tax = await prisma.taxConfiguration.findFirst({
      where: { id, propertyId },
    });
    if (!tax) {
      throw new NotFoundException(`Tax configuration '${id}' not found`);
    }

    await prisma.taxConfiguration.delete({ where: { id } });
    return { success: true, deletedId: id };
  }

  /**
   * Calculates dynamic taxes supporting additive and compounding (e.g. Service Charge + PBJT on Base + Service)
   * or inclusive tax back-calculation without floating-point inaccuracies.
   */
  async calculateTaxes(
    propertyId: string,
    amount: bigint,
    ratePlanId?: string,
    currency: string = 'IDR'
  ): Promise<TaxCalculationResult> {
    const taxes = await prisma.taxConfiguration.findMany({
      where: {
        propertyId,
        isActive: true,
        ...(ratePlanId
          ? {
              ratePlanTaxes: {
                some: { ratePlanId },
              },
            }
          : {}),
      },
      orderBy: { calculationOrder: 'asc' },
    });

    if (taxes.length === 0) {
      return {
        baseAmount: amount,
        netAmount: amount,
        totalTaxAmount: BigInt(0),
        grossAmount: amount,
        currency,
        details: [],
      };
    }

    const isAllInclusive = taxes.every((t) => t.isInclusive);

    if (isAllInclusive) {
      // Inclusive Pricing (e.g. Rp 1.000.000 nett):
      // Total effective tax rate = sum(rates)
      const totalRatePercent = taxes.reduce((acc, t) => acc + Number(t.ratePercentage), 0);
      // Net = Amount / (1 + totalRate/100)
      const netAmount = BigInt(Math.round(Number(amount) / (1 + totalRatePercent / 100)));
      const totalTaxAmount = amount - netAmount;

      const details: TaxCalculationDetail[] = taxes.map((t) => {
        const taxShare = BigInt(
          Math.round((Number(totalTaxAmount) * Number(t.ratePercentage)) / totalRatePercent)
        );
        return {
          taxId: t.id,
          code: t.code,
          name: t.name,
          ratePercentage: Number(t.ratePercentage),
          amount: taxShare,
          isInclusive: true,
        };
      });

      return {
        baseAmount: amount,
        netAmount,
        totalTaxAmount,
        grossAmount: amount,
        currency,
        details,
      };
    } else {
      // Exclusive Pricing (e.g. Room Rate + 10% Service Charge + 10% PBJT on subtotal)
      let runningSubtotal = Number(amount);
      let totalTaxAcc = 0;
      const details: TaxCalculationDetail[] = [];

      for (const t of taxes) {
        const rate = Number(t.ratePercentage) / 100;
        const taxAmountNum = Math.round(runningSubtotal * rate);
        const taxAmount = BigInt(taxAmountNum);

        details.push({
          taxId: t.id,
          code: t.code,
          name: t.name,
          ratePercentage: Number(t.ratePercentage),
          amount: taxAmount,
          isInclusive: false,
        });

        totalTaxAcc += taxAmountNum;
        // In Indonesian hospitality: Order 1 = Service Charge, Order 2 = PBJT calculated over (Rate + Service)
        runningSubtotal += taxAmountNum;
      }

      const totalTaxAmount = BigInt(totalTaxAcc);
      const grossAmount = amount + totalTaxAmount;

      return {
        baseAmount: amount,
        netAmount: amount,
        totalTaxAmount,
        grossAmount,
        currency,
        details,
      };
    }
  }
}
