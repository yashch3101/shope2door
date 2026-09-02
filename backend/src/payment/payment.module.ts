import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { PaymentController } from './payment.controller';
import { PaymentWebhookController } from './payment.webhook.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    PaymentController,
    PaymentWebhookController,
  ],

  providers: [
    PaymentService,
  ],

  exports: [
    PaymentService,
  ],
})
export class PaymentModule {}
