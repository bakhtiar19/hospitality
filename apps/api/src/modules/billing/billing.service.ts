import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@hospitality/database';

export interface PostChargeDto {
  category: string; // ROOM, FNB, LAUNDRY, MINIBAR, EXTRA_BED
  amount: number | string;
  description: string;
}

export interface RecordPaymentDto {
  amount: number | string;
  paymentMethod: string; // CASH, EDC_CARD, BANK_TRANSFER, QRIS
  gateway?: string;
  gatewayTransactionId?: string;
}

@Injectable()
export class BillingService {
  async getFolio(propertyId: string, folioId: string) {
    const folio = await prisma.folio.findFirst({
      where: { id: folioId, propertyId },
      include: {
        booking: {
          include: {
            primaryGuest: true,
            bookingRooms: { include: { room: true, roomType: true, ratePlan: true } },
          },
        },
        transactions: {
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!folio) {
      throw new NotFoundException(`Folio '${folioId}' not found`);
    }

    return folio;
  }

  async postCharge(propertyId: string, folioId: string, dto: PostChargeDto, userId?: string) {
    const folio = await prisma.folio.findFirst({
      where: { id: folioId, propertyId },
    });
    if (!folio) {
      throw new NotFoundException(`Folio '${folioId}' not found`);
    }

    const chargeAmount = BigInt(dto.amount);

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.folioTransaction.create({
        data: {
          folioId,
          transactionType: 'CHARGE',
          category: dto.category,
          amount: chargeAmount,
          currency: 'IDR',
          description: dto.description,
          createdBy: userId,
        },
      });

      const updatedFolio = await tx.folio.update({
        where: { id: folioId },
        data: {
          totalCharges: { increment: chargeAmount },
          balance: { increment: chargeAmount },
        },
      });

      return { transaction, folio: updatedFolio };
    });
  }

  async recordPayment(propertyId: string, folioId: string, dto: RecordPaymentDto, userId?: string) {
    const folio = await prisma.folio.findFirst({
      where: { id: folioId, propertyId },
      include: { booking: true },
    });
    if (!folio) {
      throw new NotFoundException(`Folio '${folioId}' not found`);
    }

    const payAmount = BigInt(dto.amount);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          propertyId,
          folioId,
          bookingId: folio.bookingId,
          amount: payAmount,
          currency: 'IDR',
          paymentMethod: dto.paymentMethod,
          status: 'SUCCESS',
          gateway: dto.gateway,
          gatewayTransactionId: dto.gatewayTransactionId,
          createdBy: userId,
        },
      });

      await tx.folioTransaction.create({
        data: {
          folioId,
          transactionType: 'PAYMENT',
          category: dto.paymentMethod,
          amount: payAmount,
          currency: 'IDR',
          description: `Payment via ${dto.paymentMethod}${dto.gatewayTransactionId ? ` (${dto.gatewayTransactionId})` : ''}`,
          createdBy: userId,
        },
      });

      const updatedFolio = await tx.folio.update({
        where: { id: folioId },
        data: {
          totalPayments: { increment: payAmount },
          balance: { decrement: payAmount },
        },
      });

      // Update Booking totalPaid & paymentStatus
      const newBalance = updatedFolio.balance;
      const paymentStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

      await tx.booking.update({
        where: { id: folio.bookingId },
        data: {
          totalPaid: { increment: payAmount },
          paymentStatus,
        },
      });

      return { payment, folio: updatedFolio };
    });
  }

  async generateInvoice(propertyId: string, folioId: string) {
    const folio = await this.getFolio(propertyId, folioId);

    const invoiceNumber = `INV-${folio.folioNumber}`;
    let invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
    });

    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          folioId: folio.id,
          invoiceNumber,
          totalAmount: folio.totalCharges,
          currency: 'IDR',
          taxSummary: {
            serviceCharge: '10%',
            pbjtSurakarta: '10%',
            breakdown: folio.transactions
              .filter((t) => t.category.includes('TAX') || t.category.includes('SERVICE'))
              .map((t) => ({
                id: t.id,
                description: t.description,
                category: t.category,
                amount: t.amount.toString(),
              })),
          },
        },
      });
    }

    return {
      invoice,
      folio,
    };
  }
}
