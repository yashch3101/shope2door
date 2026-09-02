import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  couponCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}