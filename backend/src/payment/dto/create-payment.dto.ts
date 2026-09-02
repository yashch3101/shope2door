import {
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';

import { PaymentMethod } from '../../generated/prisma/client';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}