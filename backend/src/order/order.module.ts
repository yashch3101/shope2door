import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CouponModule } from '../coupon/coupon.module';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    PrismaModule,
    CouponModule,
  ],

  controllers: [
    OrderController,
  ],

  providers: [
    OrderService,
  ],

  exports: [
    OrderService,
  ],
})
export class OrderModule {}