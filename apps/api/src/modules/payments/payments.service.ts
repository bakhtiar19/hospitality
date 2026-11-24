import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from '@hospitality/database';
import { MidtransAdapter } from './adapters/midtrans.adapter.js';
import {
  PaymentChargeDto,
  PaymentChargeResult,
  PaymentWebhookResult,
} from './interfaces/payment-gateway.interface.js';
import { EventsGateway } from '../websocket/events.gateway.js';

export interface CreateDirectBookingPaymentDto {
  bookingNumber: string;
  propertyId: string;
  amount: bigint;
  currency: string;
  paymentMethod: 'QRIS' | 'VIRTUAL_ACCOUNT' | 'CREDIT_CARD';
  customerDetails: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
  bank?: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // In-memory transactions cache for sandbox testing
  private transactions = new Map<string, PaymentChargeResult>();

  constructor(
    private readonly midtransAdapter: MidtransAdapter,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createDirectPayment(dto: CreateDirectBookingPaymentDto): Promise<PaymentChargeResult> {
    const chargeDto: PaymentChargeDto = {
      orderId: dto.bookingNumber,
      propertyId: dto.propertyId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      customerDetails: dto.customerDetails,
      bank: dto.bank,
    };

    const result = await this.midtransAdapter.createCharge(chargeDto);
    this.transactions.set(dto.bookingNumber, result);
    this.logger.log(`Created ${dto.paymentMethod} charge for ${dto.bookingNumber} (${result.transactionId})`);

    return result;
  }

  async getPaymentStatus(bookingNumber: string): Promise<PaymentChargeResult> {
    const tx = this.transactions.get(bookingNumber);
    if (!tx) {
      throw new NotFoundException(`No payment transaction found for ${bookingNumber}`);
    }
    return tx;
  }

  async handleMidtransWebhook(payload: any, signatureHeader?: string): Promise<{ success: boolean; status: string }> {
    const orderId = payload.order_id || payload.orderId;
    if (!orderId) {
      throw new BadRequestException('Missing order_id in webhook payload');
    }

    // Verify signature if header is provided
    if (signatureHeader) {
      const isValid = this.midtransAdapter.verifySignature(payload, signatureHeader);
      if (!isValid) {
        this.logger.warn(`Invalid signature received for Midtrans webhook on order ${orderId}`);
        throw new BadRequestException('Invalid signature');
      }
    }

    const webhookResult: PaymentWebhookResult = await this.midtransAdapter.processWebhook(payload);
    this.logger.log(`Processing Midtrans webhook for ${orderId}: ${webhookResult.status}`);

    // Update in-memory transaction status
    const existing = this.transactions.get(orderId);
    if (existing) {
      existing.status = webhookResult.status;
      this.transactions.set(orderId, existing);
    }

    // If database connected and booking exists, update status
    if (process.env.DATABASE_URL && webhookResult.status === 'SETTLED') {
      try {
        const booking = await prisma.booking.findFirst({
          where: { bookingNumber: orderId },
          include: { folios: true },
        });

        if (booking) {
          await prisma.$transaction(async (tx) => {
            // Update booking payment status
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                paymentStatus: 'PAID',
                totalPaid: { increment: webhookResult.amount },
              },
            });

            // Update folio if exists
            if (booking.folios[0]) {
              await tx.folio.update({
                where: { id: booking.folios[0].id },
                data: {
                  totalPayments: { increment: webhookResult.amount },
                  balance: { decrement: webhookResult.amount },
                },
              });
            }

            // Insert outbox event
            await tx.outboxEvent.create({
              data: {
                aggregateType: 'BOOKING',
                aggregateId: booking.id,
                eventType: 'PAYMENT_SETTLED',
                payload: {
                  propertyId: booking.propertyId,
                  bookingNumber: booking.bookingNumber,
                  amount: webhookResult.amount.toString(),
                  paymentMethod: webhookResult.paymentMethod,
                  transactionId: webhookResult.transactionId,
                },
              },
            });
          });

          // WebSocket broadcast strictly after commit
          this.eventsGateway.broadcastPaymentSettled(booking.propertyId, {
            bookingNumber: booking.bookingNumber,
            amount: webhookResult.amount.toString(),
            paymentMethod: webhookResult.paymentMethod,
          });
        }
      } catch (err: any) {
        this.logger.error(`Database error settling booking ${orderId}: ${err.message}`);
      }
    }

    return {
      success: true,
      status: webhookResult.status,
    };
  }
}
