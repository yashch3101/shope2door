import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { CouponType } from '../../generated/prisma/client';

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(CouponType)
  @IsOptional()
  type?: CouponType;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  value?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscount?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}