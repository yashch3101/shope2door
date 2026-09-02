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
  MinLength,
} from 'class-validator';

export class CreateAdminProductDto {
  // =====================================================
  // BASIC INFORMATION
  // =====================================================

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  slug: string;

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
  price: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'MRP must be a valid number with at most 2 decimals',
    },
  )
  @Min(0)
  mrp: number;

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
  stock: number;

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
  @IsNotEmpty()
  categoryId: string;
}