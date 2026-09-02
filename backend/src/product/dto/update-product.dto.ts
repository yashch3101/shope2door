import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  // =====================================================
  // BASIC INFORMATION
  // =====================================================

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // =====================================================
  // PRICING
  // =====================================================

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  costPrice?: number;

  // =====================================================
  // INVENTORY
  // =====================================================

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  weight?: string;

  // =====================================================
  // PRODUCT INFORMATION
  // =====================================================

  @IsOptional()
  @IsString()
  @MaxLength(150)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  // =====================================================
  // IMAGES
  // =====================================================

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  images?: string[];

  // =====================================================
  // CATEGORY
  // =====================================================

  @IsOptional()
  @IsString()
  categoryId?: string;

  // =====================================================
  // STATE
  // =====================================================

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}