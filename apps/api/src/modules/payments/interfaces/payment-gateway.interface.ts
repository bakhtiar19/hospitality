export type PaymentMethod = 'QRIS' | 'VIRTUAL_ACCOUNT' | 'CREDIT_CARD';

export interface CustomerDetails {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
}

export interface PaymentChargeDto {
  orderId: string;
  propertyId: string;
  amount: bigint;
  currency: string;
  paymentMethod: PaymentMethod;
  customerDetails: CustomerDetails;
  bank?: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI';
}

export interface PaymentChargeResult {
  transactionId: string;
  orderId: string;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED' | 'FAILED';
  paymentMethod: PaymentMethod;
  amount: bigint;
  currency: string;
  qrisString?: string;
  qrisUrl?: string;
  vaNumber?: string;
  vaBank?: string;
  expiryTime: string;
}

export interface PaymentWebhookResult {
  orderId: string;
  transactionId: string;
  status: 'SETTLED' | 'PENDING' | 'EXPIRED' | 'FAILED';
  amount: bigint;
  paymentMethod: PaymentMethod;
  settledAt?: string;
}

export interface PaymentGateway {
  readonly gatewayName: string;

  createCharge(dto: PaymentChargeDto): Promise<PaymentChargeResult>;
  verifySignature(payload: any, signature: string): boolean;
  processWebhook(payload: any): Promise<PaymentWebhookResult>;
}
