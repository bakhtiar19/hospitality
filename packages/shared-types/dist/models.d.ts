import { BookingStatus, ChannelCode, HousekeepingStatus, PaymentMethod, PaymentStatus, RoomOperationalStatus, UserRole } from './enums.js';
export interface UserPayload {
    sub: string;
    email: string;
    role: UserRole;
    propertyId: string;
    permissions: string[];
}
export interface IProperty {
    id: string;
    code: string;
    name: string;
    city: string;
    address?: string;
    timezone: string;
    defaultCurrency: string;
    isActive: boolean;
    createdAt: Date;
}
export interface ITaxConfiguration {
    id: string;
    propertyId: string;
    code: string;
    name: string;
    ratePercentage: number;
    calculationOrder: number;
    isInclusive: boolean;
    isActive: boolean;
}
export interface IRoomType {
    id: string;
    propertyId: string;
    code: string;
    name: string;
    totalRooms: number;
    baseOccupancy: number;
    maxOccupancy: number;
    amenities: string[];
    isActive: boolean;
}
export interface IRoom {
    id: string;
    propertyId: string;
    roomTypeId: string;
    floorId: string;
    roomNumber: string;
    operationalStatus: RoomOperationalStatus;
    housekeepingStatus: HousekeepingStatus;
    isClean: boolean;
}
export interface IBooking {
    id: string;
    propertyId: string;
    bookingNumber: string;
    channelReference?: string;
    primaryGuestId: string;
    bookingSource: ChannelCode;
    status: BookingStatus;
    checkInDate: string;
    checkOutDate: string;
    actualCheckInAt?: Date;
    actualCheckOutAt?: Date;
    totalAmount: number;
    totalPaid: number;
    currency: string;
    paymentStatus: PaymentStatus;
    specialRequests?: string;
}
export interface IBookingRoom {
    id: string;
    bookingId: string;
    roomTypeId: string;
    roomId?: string | null;
    ratePlanId: string;
    stayRange: [string, string];
    roomRate: number;
    currency: string;
    roomStatus: string;
}
export interface IFolioTransaction {
    id: string;
    folioId: string;
    transactionType: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT';
    category: string;
    amount: number;
    currency: string;
    description: string;
    paymentMethod?: PaymentMethod;
    createdAt: Date;
}
//# sourceMappingURL=models.d.ts.map