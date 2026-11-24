import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString, IsUUID } from 'class-validator';

export class GuestInfoDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  idType?: string; // KTP, Passport, SIM

  @IsString()
  @IsOptional()
  idNumber?: string;
}

export class CreateBookingDto {
  primaryGuest!: GuestInfoDto;

  @IsUUID()
  roomTypeId!: string;

  @IsUUID()
  @IsOptional()
  roomId?: string; // Nullable for unassigned OTA reservations!

  @IsUUID()
  ratePlanId!: string;

  @IsDateString()
  checkInDate!: string; // YYYY-MM-DD

  @IsDateString()
  checkOutDate!: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  bookingSource?: string; // DIRECT, AGODA, WALK_IN

  @IsString()
  @IsOptional()
  channelReference?: string;

  @IsString()
  @IsOptional()
  specialRequests?: string;
}

export class MoveRoomDto {
  @IsUUID()
  bookingRoomId!: string;

  @IsUUID()
  targetRoomId!: string;
}

export class CancelBookingDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
