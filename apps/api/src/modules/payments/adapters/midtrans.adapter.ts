import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentGateway,
  PaymentChargeDto,
  PaymentChargeResult,
  PaymentWebhookResult,
} from '../interfaces/payment-gateway.interface.js';

@Injectable()
export class MidtransAdapter implements PaymentGateway {
  readonly gatewayName = 'MIDTRANS_SANDBOX';
  private readonly logger = new Logger(MidtransAdapter.name);
  private readonly serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-sandbox-key-winotosastro';

  async createCharge(dto: PaymentChargeDto): Promise<PaymentChargeResult> {
    const transactionId = `midtrans-tx-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    if (dto.paymentMethod === 'QRIS') {
      const qrisString = `00020101021226680016ID.CO.MIDTRANS.WWW01189360050300000880125204581453033605802ID5928HOTEL WINOTOSASTRO SURAKARTA6009SURAKARTA62070703A016304${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        transactionId,
        orderId: dto.orderId,
        status: 'PENDING',
        paymentMethod: 'QRIS',
        amount: dto.amount,
        currency: dto.currency,
        qrisString,
        qrisUrl: `https://api.sandbox.midtrans.com/v2/qris/${transactionId}/qr-code`,
        expiryTime,
      };
    }

    if (dto.paymentMethod === 'VIRTUAL_ACCOUNT') {
      const bank = dto.bank || 'BCA';
      const bankPrefix = bank === 'BCA' ? '70012' : bank === 'MANDIRI' ? '88012' : '99012';
      const vaNumber = `${bankPrefix}${Math.floor(10000000 + Math.random() * 90000000)}`;
      return {
        transactionId,
        orderId: dto.orderId,
        status: 'PENDING',
        paymentMethod: 'VIRTUAL_ACCOUNT',
        amount: dto.amount,
        currency: dto.currency,
        vaNumber,
        vaBank: bank,
        expiryTime,
      };
    }

    // Default Credit Card
    return {
      transactionId,
      orderId: dto.orderId,
      status: 'PENDING',
      paymentMethod: 'CREDIT_CARD',
      amount: dto.amount,
      currency: dto.currency,
      expiryTime,
    };
  }

  verifySignature(payload: any, signature: string): boolean {
    if (!signature) return false;
    const orderId = payload.order_id || payload.orderId;
    const statusCode = payload.status_code || '200';
    const grossAmount = payload.gross_amount || payload.amount?.toString() || '0';

    const raw = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const expected = crypto.createHash('sha512').update(raw).digest('hex');

    return signature.toLowerCase() === expected.toLowerCase();
  }

  generateSignature(orderId: string, statusCode: string, grossAmount: string): string {
    const raw = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    return crypto.createHash('sha512').update(raw).digest('hex');
  }

  async processWebhook(payload: any): Promise<PaymentWebhookResult> {
    const orderId = payload.order_id || payload.orderId;
    const transactionId = payload.transaction_id || payload.transactionId || `tx-${Date.now()}`;
    const status = payload.transaction_status || payload.status;
    const grossAmount = BigInt(Math.round(parseFloat(payload.gross_amount || payload.amount || '0')));

    const isSettled = ['settlement', 'capture', 'SETTLED'].includes(status);
    const isExpired = ['expire', 'cancel', 'EXPIRED'].includes(status);

    return {
      orderId,
      transactionId,
      status: isSettled ? 'SETTLED' : isExpired ? 'EXPIRED' : 'PENDING',
      amount: grossAmount,
      paymentMethod: payload.payment_type?.toUpperCase() === 'QRIS' ? 'QRIS' : 'VIRTUAL_ACCOUNT',
      settledAt: isSettled ? new Date().toISOString() : undefined,
    };
  }
}
