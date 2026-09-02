import {
  IsNumber,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
  cartAmount: number;
}