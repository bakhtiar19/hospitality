export interface AvailabilityUpdate {
  roomTypeId: string;
  channelRoomCode: string;
  date: string; // YYYY-MM-DD
  availableUnits: number;
}

export interface RateUpdate {
  roomTypeId: string;
  ratePlanId: string;
  channelRoomCode: string;
  channelRateCode: string;
  date: string;
  amount: bigint;
  currency: string;
}

export interface RestrictionUpdate {
  roomTypeId: string;
  ratePlanId: string;
  channelRoomCode: string;
  channelRateCode: string;
  date: string;
  minStay: number;
  isClosedToArrival: boolean;
  isClosedToDeparture: boolean;
  isStopSell: boolean;
}

export interface ChannelReservationGuest {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationality?: string;
}

export interface ChannelReservationStay {
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
}

export interface ChannelReservationPricing {
  currency: string;
  totalAmount: number;
  dailyRates?: Array<{ date: string; amount: number }>;
}

export interface ChannelReservation {
  channelReservationId: string;
  hotelId: string;
  roomTypeCode: string;
  ratePlanCode: string;
  guest: ChannelReservationGuest;
  stay: ChannelReservationStay;
  pricing: ChannelReservationPricing;
  status: 'CONFIRMED' | 'MODIFIED' | 'CANCELLED';
  action: 'NEW_BOOKING' | 'MODIFICATION' | 'CANCELLATION';
  specialRequests?: string;
  createdAt: string;
}

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  latencyMs: number;
  rawRequest: any;
  rawResponse: any;
  error?: string;
}

export interface ChannelHealth {
  channelCode: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  message?: string;
  timestamp: string;
}

export interface ChannelAdapter {
  readonly channelCode: string;

  pushAvailability(propertyId: string, updates: AvailabilityUpdate[]): Promise<SyncResult>;
  pushRates(propertyId: string, updates: RateUpdate[]): Promise<SyncResult>;
  pushRestrictions(propertyId: string, updates: RestrictionUpdate[]): Promise<SyncResult>;
  pullReservations(propertyId: string): Promise<ChannelReservation[]>;
  acknowledgeReservation(propertyId: string, channelReservationId: string): Promise<boolean>;
  healthCheck(propertyId: string): Promise<ChannelHealth>;
}
