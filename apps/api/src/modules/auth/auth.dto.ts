import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class RegisterHotelDto {
  @IsString()
  @IsNotEmpty()
  hotelName!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  propertyCode?: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class CreateStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(['MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT'])
  role!: 'MANAGER' | 'FRONT_DESK' | 'HOUSEKEEPING' | 'ACCOUNTANT';
}

export class UpdateStaffStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
