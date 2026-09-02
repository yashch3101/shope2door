import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { AddressType } from '../../generated/prisma/client';

export class UpdateAddressDto {
  // =====================================================
  // ADDRESS TYPE
  // =====================================================

  @IsEnum(AddressType)
  @IsOptional()
  type?: AddressType;

  // =====================================================
  // CONTACT
  // =====================================================

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Phone number must be a valid 10-digit Indian mobile number',
  })
  phone?: string;

  // =====================================================
  // ADDRESS
  // =====================================================

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  landmark?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, {
    message:
      'Pincode must be a valid 6-digit Indian pincode',
  })
  pincode?: string;

  // =====================================================
  // LOCATION
  // =====================================================

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  // =====================================================
  // DEFAULT ADDRESS
  // =====================================================

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}