import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';

import { Request } from 'express';

import { PaymentService } from './payment.service';

interface RawBodyRequest
  extends Request {
  rawBody?: Buffer;
}

@Controller('payments')
export class PaymentWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest,

    @Headers(
      'x-razorpay-signature',
    )
    signature: string,

    @Headers(
      'x-razorpay-event-id',
    )
    eventId: string,
  ) {
    if (!signature) {
      throw new BadRequestException(
        'Missing Razorpay signature',
      );
    }

    if (!eventId) {
      throw new BadRequestException(
        'Missing Razorpay event ID',
      );
    }

    if (!req.rawBody) {
      throw new BadRequestException(
        'Raw request body is unavailable',
      );
    }

    return this.paymentService.handleWebhook(
      req.rawBody,

      signature,

      eventId,
    );
  }
}
