import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

import { PaymentService } from './payment.service';

import {
  Roles,
} from '../auth/decorators/roles.decorator';

import {
  UserRole,
} from '../generated/prisma/client';

import { CreateRefundDto } from './dto/create-refund.dto';

interface AuthenticatedRequest
  extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
  ) {}

  // =====================================================
  // INITIATE PAYMENT
  // =====================================================

  @Post('initiate')
  async initiatePayment(
    @Req()
    req: AuthenticatedRequest,

    @Body()
    dto: CreatePaymentDto,
  ) {
    return this.paymentService.initiatePayment(
      req.user.id,

      dto,
    );
  }

  // =====================================================
  // VERIFY ONLINE PAYMENT
  // =====================================================

  @Post('verify')
  async verifyPayment(
    @Req()
    req: AuthenticatedRequest,

    @Body()
    dto: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyPayment(
      req.user.id,

      dto,
    );
  }

  // =====================================================
  // GET ORDER PAYMENTS
  // =====================================================

  @Get('order/:orderId')
  async getOrderPayments(
    @Req()
    req: AuthenticatedRequest,

    @Param('orderId')
    orderId: string,
  ) {
    return this.paymentService.getOrderPayments(
      req.user.id,

      orderId,
    );
  }

  // =====================================================
  // GET SINGLE PAYMENT
  // =====================================================

  @Get(':paymentId')
  async getPayment(
    @Req()
    req: AuthenticatedRequest,

    @Param('paymentId')
    paymentId: string,
  ) {
    return this.paymentService.getPayment(
      req.user.id,

      paymentId,
    );
  }

  @Post(':paymentId/refund')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async refundPayment(
    @Param('paymentId')
    paymentId: string,

    @Body()
    dto: CreateRefundDto,
  ) {
    return this.paymentService.refundPayment(
      paymentId,
      dto,
    );
  }
}
