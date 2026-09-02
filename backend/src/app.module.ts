import Joi from 'joi';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { APP_GUARD } from '@nestjs/core';

import { HealthModule } from './health/health.module';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AddressModule } from './address/address.module';
import { CouponModule } from './coupon/coupon.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';

import { ScheduleModule } from '@nestjs/schedule';

import { OrderScheduler } from './order/order.scheduler';

@Module({
  imports: [

    ScheduleModule.forRoot(),
    // ===================================================
    // ENVIRONMENT CONFIGURATION
    // ===================================================

    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,

      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),

        PORT: Joi.number()
          .port()
          .default(3000),

        DATABASE_URL: Joi.string()
          .uri()
          .required(),

        JWT_ACCESS_SECRET: Joi.string()
          .min(32)
          .required(),

        JWT_REFRESH_SECRET: Joi.string()
          .min(32)
          .required(),

        JWT_ACCESS_EXPIRES_IN: Joi.string()
          .default('15m'),

        JWT_REFRESH_EXPIRES_IN: Joi.string()
          .default('7d'),

        CORS_ORIGINS: Joi.string()
          .allow('')
          .default(''),

        RAZORPAY_KEY_ID: Joi.string()
          .required(),

        RAZORPAY_KEY_SECRET: Joi.string()
          .required(),

        RAZORPAY_WEBHOOK_SECRET: Joi.string()
          .required(),
      }),
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // ===================================================
    // CORE MODULES
    // ===================================================

    PrismaModule,

    AuthModule,

    CategoryModule,

    ProductModule,

    CartModule,

    WishlistModule,

    AddressModule,

    CouponModule,

    OrderModule,

    PaymentModule,

    AdminModule,

    HealthModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
    OrderScheduler,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
