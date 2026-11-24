import { ChannelCode } from './enums.js';

export interface AvailabilityUpdate {
  roomTypeCode: string;
  date: string; // YYYY-MM-DD
  availableRooms: number;
}

export interface RateUpdate {
  roomTypeCode: string;
  ratePlanCode: string;
  date: string; // YYYY-MM-DD
  amount: number; // minor units
  currency: string;
}

export interface RestrictionUpdate {
  roomTypeCode: string;
  ratePlanCode: string;
  date: string; // YYYY-MM-DD
  minStayArrival?: number;
  maxStay?: number;
  isClosed?: boolean;
  isClosedToArrival?: boolean;
  isClosedToDeparture?: boolean;
}

export interface ChannelSyncResult {
  success: boolean;
  channelCode: ChannelCode;
  itemsProcessed: number;
  syncedAt: Date;
  rawResponse?: string;
  error?: string;
}

export interface ChannelReservation {
  channelCode: ChannelCode;
  channelReservationId: string;
  bookingSource: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  roomTypeCode: string;
  ratePlanCode: string;
  totalAmount: number;
  currency: string;
  numberOfGuests: number;
  specialRequests?: string;
  rawPayload: Record<string, unknown>;
}

export interface ChannelMappingMetadata {
  roomTypeMappings: Record<string, string>; // internalId -> otaCode
  ratePlanMappings: Record<string, string>; // internalId -> otaCode
}

export interface ChannelHealthStatus {
  channelCode: ChannelCode;
  isHealthy: boolean;
  latencyMs: number;
  lastSyncAt?: Date;
  statusMessage: string;
}

export interface ChannelAdapter {
  readonly channelCode: ChannelCode;

  pushAvailability(propertyId: string, updates: AvailabilityUpdate[]): Promise<ChannelSyncResult>;
  pushRates(propertyId: string, updates: RateUpdate[]): Promise<ChannelSyncResult>;
  pushRestrictions(propertyId: string, updates: RestrictionUpdate[]): Promise<ChannelSyncResult>;

  pullReservations(propertyId: string, since: Date): Promise<ChannelReservation[]>;
  acknowledgeReservation(propertyId: string, channelReservationId: string): Promise<boolean>;

  fetchMapping(propertyId: string): Promise<ChannelMappingMetadata>;
  healthCheck(propertyId: string): Promise<ChannelHealthStatus>;
}
