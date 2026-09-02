import {
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateRefundDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}