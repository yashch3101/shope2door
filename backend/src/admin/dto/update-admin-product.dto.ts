import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAdminProductDto {
  // =====================================================
  // BASIC INFORMATION
  // =====================================================

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  // =====================================================
  // PRICING
  // =====================================================

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'Price must be a valid number with at most 2 decimals',
    },
  )
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'MRP must be a valid number with at most 2 decimals',
    },
  )
  @Min(0)
  @IsOptional()
  mrp?: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Cost price must be a valid number with at most 2 decimals',
    },
  )
  @Min(0)
  @IsOptional()
  costPrice?: number;

  // =====================================================
  // INVENTORY
  // =====================================================

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  weight?: string;

  // =====================================================
  // PRODUCT INFORMATION
  // =====================================================

  @IsString()
  @IsOptional()
  @MaxLength(150)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  // =====================================================
  // PRODUCT STATE
  // =====================================================

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  // =====================================================
  // CATEGORY
  // =====================================================

  @IsString()
  @IsOptional()
  categoryId?: string;
}