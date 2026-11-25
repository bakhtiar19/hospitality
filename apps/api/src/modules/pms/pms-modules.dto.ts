import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpsertRoomTypeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxOccupancy?: number;

  @IsNumber()
  @Min(1000)
  baseRate!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  generateUnits?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  floorNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  startRoomNumber?: number;
}

export class CreateRoomUnitDto {
  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @IsString()
  @IsNotEmpty()
  roomTypeId!: string;

  @IsInt()
  @Min(1)
  floorNumber!: number;
}

export class UpdateHousekeepingRoomDto {
  @IsIn(['CLEAN', 'DIRTY', 'INSPECTED', 'TOUCH_UP', 'OUT_OF_ORDER'])
  status!: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'TOUCH_UP' | 'OUT_OF_ORDER';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateGuestCrmDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  idType?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsIn(['VIP', 'REGULAR', 'STANDARD', 'BLACKLIST'])
  vipStatus?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateGuestCrmDto {
  @IsOptional()
  @IsIn(['VIP', 'REGULAR', 'STANDARD', 'BLACKLIST'])
  vipStatus?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class MergeGuestsDto {
  @IsString()
  @IsNotEmpty()
  targetGuestId!: string;

  @IsString()
  @IsNotEmpty()
  sourceGuestId!: string;
}

export class UpdateRatePriceDto {
  @IsString()
  @IsNotEmpty()
  roomTypeId!: string;

  @IsString()
  @IsNotEmpty()
  ratePlanId!: string;

  @IsNumber()
  @Min(1000)
  basePrice!: number;
}

export class CreateRatePlanDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TriggerChannelSyncDto {
  @IsOptional()
  @IsIn(['AVAILABILITY', 'RATES', 'RESERVATIONS_PULL'])
  syncType?: 'AVAILABILITY' | 'RATES' | 'RESERVATIONS_PULL';

  @IsOptional()
  @IsString()
  channelCode?: string;
}
