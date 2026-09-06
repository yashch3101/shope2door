import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { CouponModule } from '../coupon/coupon.module';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PrismaModule, CouponModule, ConfigModule],

  controllers: [OrderController],

  providers: [OrderService],

  exports: [OrderService],
})
export class OrderModule {}
