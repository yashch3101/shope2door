import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'Invalid order status',
  })
  @IsNotEmpty()
  status: OrderStatus;
}
