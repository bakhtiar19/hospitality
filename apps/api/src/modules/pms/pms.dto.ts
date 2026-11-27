import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePmsBookingDto {
  @IsString()
  @IsNotEmpty()
  guestName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  idType?: string;

  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @IsOptional()
  @IsString()
  ratePlan?: string;

  @IsString()
  @IsNotEmpty()
  checkInDate!: string;

  @IsString()
  @IsNotEmpty()
  checkOutDate!: string;

  @IsOptional()
  @IsIn(['WALK_IN', 'FIT', 'OTA', 'CORPORATE'])
  reservationType?: 'WALK_IN' | 'FIT' | 'OTA' | 'CORPORATE';

  @IsOptional()
  @IsIn(['DIRECT', 'AGODA', 'WALK_IN', 'CORPORATE'])
  source?: 'DIRECT' | 'AGODA' | 'WALK_IN' | 'CORPORATE';

  @IsOptional()
  @IsBoolean()
  autoCheckIn?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nightlyRate?: number;

  @IsOptional()
  @IsString()
  initialPaymentMethod?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPaymentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPmsPaymentDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsIn(['CASH', 'EDC', 'CITY_LEDGER', 'OTA_VOUCHER', 'BANK_TRANSFER'])
  method!: 'CASH' | 'EDC' | 'CITY_LEDGER' | 'OTA_VOUCHER' | 'BANK_TRANSFER';

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  date?: string;
}

export class ExtendPmsStayDto {
  @IsString()
  @IsNotEmpty()
  newCheckOutDate!: string;

  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nightlyRate?: number;
}

export class CheckOutPmsDto {
  @IsOptional()
  @IsString()
  todayDate?: string;
}

export class CancelPmsBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SettleOtaBatchDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsString()
  reference?: string;
}

export class UpdatePmsSettingsDto {
  @IsOptional()
  @IsString()
  hotelName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  npwpd?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  pbjtRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceChargeRate?: number;

  @IsOptional()
  @IsBoolean()
  pbjtEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  serviceChargeEnabled?: boolean;
}

export class CreatePublicBookingDto {
  @IsString()
  @IsNotEmpty()
  roomTypeCode!: string;

  @IsString()
  @IsNotEmpty()
  checkInDate!: string;

  @IsString()
  @IsNotEmpty()
  checkOutDate!: string;

  @IsInt()
  @Min(1)
  guests!: number;

  @IsString()
  @IsNotEmpty()
  guestName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
