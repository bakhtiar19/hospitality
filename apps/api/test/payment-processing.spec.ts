import { describe, it, expect } from 'vitest';
import { MidtransAdapter } from '../src/modules/payments/adapters/midtrans.adapter.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';

describe('PaymentProcessing (Midtrans Sandbox & Payment Gateway)', () => {
  const adapter = new MidtransAdapter();
  const mockEventsGateway = {
    broadcastToProperty: () => {},
  } as any;
  const paymentsService = new PaymentsService(adapter, mockEventsGateway);

  it('should create QRIS charge with dynamic QR string and 15m expiration', async () => {
    const result = await adapter.createCharge({
      orderId: 'BK-WIN-TEST-001',
      propertyId: 'prop-winotosastro',
      amount: BigInt(880000),
      currency: 'IDR',
      paymentMethod: 'QRIS',
      customerDetails: {
        firstName: 'Anisa',
        email: 'anisa@example.com',
      },
    });

    expect(result.orderId).toBe('BK-WIN-TEST-001');
    expect(result.status).toBe('PENDING');
    expect(result.paymentMethod).toBe('QRIS');
    expect(result.amount).toBe(BigInt(880000));
    expect(result.qrisString).toContain('000201010212');
    expect(result.qrisString).toContain('HOTEL WINOTOSASTRO');
    expect(new Date(result.expiryTime).getTime()).toBeGreaterThan(Date.now());
  });

  it('should create Virtual Account charge with valid bank prefix', async () => {
    const result = await adapter.createCharge({
      orderId: 'BK-WIN-TEST-002',
      propertyId: 'prop-winotosastro',
      amount: BigInt(1250000),
      currency: 'IDR',
      paymentMethod: 'VIRTUAL_ACCOUNT',
      bank: 'BCA',
      customerDetails: {
        firstName: 'Rudi',
        email: 'rudi@example.com',
      },
    });

    expect(result.status).toBe('PENDING');
    expect(result.paymentMethod).toBe('VIRTUAL_ACCOUNT');
    expect(result.vaBank).toBe('BCA');
    expect(result.vaNumber?.startsWith('70012')).toBe(true);
  });

  it('should compute and verify SHA-512 webhook signature correctly', () => {
    const orderId = 'BK-WIN-TEST-001';
    const statusCode = '200';
    const grossAmount = '880000';

    const validSig = adapter.generateSignature(orderId, statusCode, grossAmount);
    expect(validSig.length).toBe(128); // SHA-512 hex length

    const isValid = adapter.verifySignature(
      { order_id: orderId, status_code: statusCode, gross_amount: grossAmount },
      validSig,
    );
    expect(isValid).toBe(true);

    // Tampered payload
    const isTamperedValid = adapter.verifySignature(
      { order_id: orderId, status_code: statusCode, gross_amount: '999999' },
      validSig,
    );
    expect(isTamperedValid).toBe(false);
  });

  it('should process settlement webhook and transition transaction status', async () => {
    const bookingNumber = 'BK-WIN-DIR-991';

    // 1. Create charge first
    await paymentsService.createDirectPayment({
      bookingNumber,
      propertyId: 'prop-winotosastro',
      amount: BigInt(750000),
      currency: 'IDR',
      paymentMethod: 'QRIS',
      customerDetails: {
        firstName: 'Lia',
        email: 'lia@example.com',
      },
    });

    const pendingStatus = await paymentsService.getPaymentStatus(bookingNumber);
    expect(pendingStatus.status).toBe('PENDING');

    // 2. Deliver simulated settlement webhook
    const webhookRes = await paymentsService.handleMidtransWebhook({
      order_id: bookingNumber,
      transaction_status: 'settlement',
      gross_amount: '750000',
      payment_type: 'qris',
    });

    expect(webhookRes.success).toBe(true);
    expect(webhookRes.status).toBe('SETTLED');

    // 3. Verify status updated to SETTLED
    const settledStatus = await paymentsService.getPaymentStatus(bookingNumber);
    expect(settledStatus.status).toBe('SETTLED');
  });
});
