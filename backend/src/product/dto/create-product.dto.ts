import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  // =====================================================
  // BASIC INFORMATION
  // =====================================================

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // =====================================================
  // PRICING
  // =====================================================

  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
  )
  @Min(0)
  price: number;

  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
  )
  @Min(0)
  mrp: number;

  @IsOptional()
  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
  )
  @Min(0)
  costPrice?: number;

  // =====================================================
  // INVENTORY
  // =====================================================

  @IsInt()
  @Min(0)
  stock: number;

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

  @IsArray()
  @IsString({
    each: true,
  })
  images: string[];

  // =====================================================
  // CATEGORY
  // =====================================================

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  // =====================================================
  // PRODUCT STATE
  // =====================================================

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}