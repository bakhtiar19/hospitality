import { Controller, Post, Get, Body, Param, Headers, HttpCode } from '@nestjs/common';
import { PaymentsService, CreateDirectBookingPaymentDto } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('charge')
  async createCharge(@Body() body: any) {
    const dto: CreateDirectBookingPaymentDto = {
      bookingNumber: body.bookingNumber || `BK-WIN-${Date.now()}`,
      propertyId: body.propertyId || 'prop-winotosastro',
      amount: BigInt(body.amount || 750000),
      currency: body.currency || 'IDR',
      paymentMethod: body.paymentMethod || 'QRIS',
      customerDetails: {
        firstName: body.customerDetails?.firstName || 'Guest',
        lastName: body.customerDetails?.lastName,
        email: body.customerDetails?.email || 'guest@example.com',
        phone: body.customerDetails?.phone,
      },
      bank: body.bank,
    };

    const result = await this.paymentsService.createDirectPayment(dto);

    // Convert BigInt to string for JSON output
    return JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  @Get('status/:bookingNumber')
  async getStatus(@Param('bookingNumber') bookingNumber: string) {
    const result = await this.paymentsService.getPaymentStatus(bookingNumber);
    return JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  @Post('webhook/midtrans')
  @HttpCode(200)
  async handleMidtransWebhook(
    @Body() payload: any,
    @Headers('x-signature') signature?: string,
  ) {
    return this.paymentsService.handleMidtransWebhook(payload, signature);
  }

  @Post('simulate-settlement')
  async simulateSettlement(@Body() body: { bookingNumber: string; amount?: number }) {
    return this.paymentsService.handleMidtransWebhook({
      order_id: body.bookingNumber,
      transaction_status: 'settlement',
      gross_amount: (body.amount || 750000).toString(),
      payment_type: 'qris',
    });
  }
}
