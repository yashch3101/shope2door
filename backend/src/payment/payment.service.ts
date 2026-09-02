import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as crypto from 'crypto';

import Razorpay from 'razorpay';

import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';

@Injectable()
export class PaymentService {
  private readonly razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    const keyId =
      process.env.RAZORPAY_KEY_ID;

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required',
      );
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  // =====================================================
  // INITIATE PAYMENT
  // =====================================================

  async initiatePayment(
    userId: string,
    dto: CreatePaymentDto,
  ) {
    // =================================================
    // 1. GET ORDER
    // =================================================

    const order =
      await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          userId,
        },

        include: {
          payments: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Order not found',
      );
    }

    // =================================================
    // 2. VALIDATE ORDER STATUS
    // =================================================

    if (
      order.status ===
        OrderStatus.CANCELLED ||
      order.status ===
        OrderStatus.RETURNED ||
      order.status ===
        OrderStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Payment cannot be initiated for this order',
      );
    }

    // =================================================
    // 3. CHECK EXISTING SUCCESSFUL PAYMENT
    // =================================================

    const successfulPayment =
      order.payments.find(
        (payment) =>
          payment.status ===
          PaymentStatus.SUCCESS,
      );

    if (successfulPayment) {
      throw new BadRequestException(
        'Payment has already been completed for this order',
      );
    }

    // =================================================
    // 4. COD
    // =================================================

    if (
      dto.paymentMethod ===
      PaymentMethod.COD
    ) {
      return this.createCodPayment(
        userId,
        order.id,
        order.total,
      );
    }

    // =================================================
    // 5. ONLINE / RAZORPAY
    // =================================================

    if (
      dto.paymentMethod ===
      PaymentMethod.ONLINE
    ) {
      return this.createOnlinePayment(
        userId,
        order.id,
        order.orderNumber,
        order.total,
      );
    }

    throw new BadRequestException(
      'Unsupported payment method',
    );
  }

  // =====================================================
  // COD PAYMENT
  // =====================================================

  private async createCodPayment(
    userId: string,
    orderId: string,
    amount: Prisma.Decimal,
  ) {
    const existingPayment =
      await this.prisma.payment.findFirst({
        where: {
          orderId,
          userId,

          method:
            PaymentMethod.COD,

          status: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.PROCESSING,
            ],
          },
        },
      });

    if (existingPayment) {
      return {
        success: true,

        message:
          'Cash on Delivery selected successfully',

        data: {
          paymentId: existingPayment.id,

          paymentMethod:
            PaymentMethod.COD,

          status:
            existingPayment.status,

          amount:
            Number(existingPayment.amount),

          currency: 'INR',
        },
      };
    }

    const payment =
      await this.prisma.payment.create({
        data: {
          amount,

          method:
            PaymentMethod.COD,

          status:
            PaymentStatus.PENDING,

          user: {
            connect: {
              id: userId,
            },
          },

          order: {
            connect: {
              id: orderId,
            },
          },
        },
      });

    return {
      success: true,

      message:
        'Cash on Delivery selected successfully',

      data: {
        paymentId: payment.id,

        paymentMethod:
          PaymentMethod.COD,

        status:
          payment.status,

        amount:
          Number(payment.amount),

        currency: 'INR',
      },
    };
  }

  // =====================================================
  // ONLINE PAYMENT — RAZORPAY
  // =====================================================

  private async createOnlinePayment(
    userId: string,
    orderId: string,
    orderNumber: string,
    amount: Prisma.Decimal,
  ) {
    // =================================================
    // 1. CHECK EXISTING RAZORPAY PAYMENT
    // =================================================

    const existingPayment =
      await this.prisma.payment.findFirst({
        where: {
          orderId,
          userId,

          method:
            PaymentMethod.ONLINE,

          status: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.PROCESSING,
            ],
          },

          gatewayOrderId: {
            not: null,
          },
        },
      });

    // =================================================
    // 2. REUSE EXISTING RAZORPAY ORDER
    // =================================================

    if (
      existingPayment?.gatewayOrderId
    ) {
      return {
        success: true,

        message:
          'Online payment initiated',

        data: {
          paymentId:
            existingPayment.id,

          paymentMethod:
            PaymentMethod.ONLINE,

          status:
            existingPayment.status,

          amount:
            Number(existingPayment.amount),

          currency: 'INR',

          razorpayOrderId:
            existingPayment.gatewayOrderId,

          razorpayKeyId:
            process.env.RAZORPAY_KEY_ID,
        },
      };
    }

    // =================================================
    // 3. CONVERT ₹ → PAISE
    // =================================================

    const amountInPaise =
      Math.round(
        Number(amount) * 100,
      );

    if (amountInPaise <= 0) {
      throw new BadRequestException(
        'Invalid payment amount',
      );
    }

    // =================================================
    // 4. CREATE RAZORPAY ORDER
    // =================================================

    const razorpayOrder =
      await this.razorpay.orders.create({
        amount:
          amountInPaise,

        currency: 'INR',

        receipt:
          orderNumber,

        notes: {
          internalOrderId:
            orderId,

          userId,
        },
      });

    // =================================================
    // 5. CREATE LOCAL PAYMENT
    // =================================================

    const payment =
      await this.prisma.payment.create({
        data: {
          amount,

          method:
            PaymentMethod.ONLINE,

          status:
            PaymentStatus.PENDING,

          gatewayOrderId:
            razorpayOrder.id,

          user: {
            connect: {
              id: userId,
            },
          },

          order: {
            connect: {
              id: orderId,
            },
          },
        },
      });

    // =================================================
    // 6. SEND CHECKOUT DATA TO FRONTEND
    // =================================================

    return {
      success: true,

      message:
        'Online payment initiated',

      data: {
        paymentId:
          payment.id,

        paymentMethod:
          PaymentMethod.ONLINE,

        status:
          payment.status,

        amount:
          Number(payment.amount),

        currency:
          razorpayOrder.currency,

        razorpayOrderId:
          razorpayOrder.id,

        razorpayKeyId:
          process.env.RAZORPAY_KEY_ID,
      },
    };
  }

  // =====================================================
  // VERIFY RAZORPAY PAYMENT
  // =====================================================

  async verifyPayment(
    userId: string,
    dto: VerifyPaymentDto,
  ) {
    const payment =
      await this.prisma.payment.findFirst({
        where: {
          orderId: dto.orderId,
          userId,
          method: PaymentMethod.ONLINE,
          gatewayOrderId: dto.razorpayOrderId,
        },
        include: {
          order: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment record not found',
      );
    }

    // Already completed = idempotent response
    if (
      payment.status === PaymentStatus.SUCCESS ||
      payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      return {
        success: true,
        message: 'Payment already verified',
        payment,
      };
    }

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new BadRequestException(
        'Razorpay configuration is missing',
      );
    }

    // ===================================================
    // 1. VERIFY CHECKOUT SIGNATURE
    // ===================================================

    const generatedSignature =
      crypto
        .createHmac(
          'sha256',
          keySecret,
        )
        .update(
          `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`,
        )
        .digest('hex');

    const generatedBuffer =
      Buffer.from(
        generatedSignature,
        'utf8',
      );

    const receivedBuffer =
      Buffer.from(
        dto.razorpaySignature,
        'utf8',
      );

    if (
      generatedBuffer.length !==
      receivedBuffer.length
    ) {
      throw new BadRequestException(
        'Invalid Razorpay payment signature',
      );
    }

    if (
      !crypto.timingSafeEqual(
        generatedBuffer,
        receivedBuffer,
      )
    ) {
      throw new BadRequestException(
        'Invalid Razorpay payment signature',
      );
    }

    // ===================================================
    // 2. FETCH ACTUAL PAYMENT FROM RAZORPAY
    // ===================================================

    let razorpayPayment: any;

    try {
      razorpayPayment =
        await this.razorpay.payments.fetch(
          dto.razorpayPaymentId,
        );
    } catch {
      throw new BadRequestException(
        'Unable to verify payment with Razorpay',
      );
    }

    // Payment must belong to the same Razorpay order.
    if (
      razorpayPayment.order_id !==
      dto.razorpayOrderId
    ) {
      throw new BadRequestException(
        'Payment does not belong to this order',
      );
    }

    // Payment must actually be captured.
    if (
      razorpayPayment.status !==
      'captured'
    ) {
      throw new BadRequestException(
        `Payment is not captured. Current status: ${razorpayPayment.status}`,
      );
    }

    // ===================================================
    // 3. VERIFY AMOUNT
    // ===================================================

    const expectedAmountPaise =
      Math.round(
        Number(payment.amount) * 100,
      );

    if (
      Number(razorpayPayment.amount) !==
      expectedAmountPaise
    ) {
      throw new BadRequestException(
        'Payment amount does not match order amount',
      );
    }

    // ===================================================
    // 4. ATOMIC SUCCESS UPDATE
    // ===================================================

    const updatedPayment =
      await this.prisma.$transaction(
        async (tx) => {
          // Re-read inside transaction so a concurrent
          // webhook/verification cannot blindly overwrite state.
          const currentPayment =
            await tx.payment.findUnique({
              where: {
                id: payment.id,
              },
              include: {
                order: true,
              },
            });

          if (!currentPayment) {
            throw new NotFoundException(
              'Payment record not found',
            );
          }

          if (
            currentPayment.status ===
              PaymentStatus.SUCCESS ||
            currentPayment.status ===
              PaymentStatus.PARTIALLY_REFUNDED ||
            currentPayment.status ===
              PaymentStatus.REFUNDED
          ) {
            return currentPayment;
          }

          const updated =
            await tx.payment.update({
              where: {
                id: currentPayment.id,
              },
              data: {
                status:
                  PaymentStatus.SUCCESS,

                transactionId:
                  dto.razorpayPaymentId,

                gatewayPaymentId:
                  dto.razorpayPaymentId,

                paidAt:
                  currentPayment.paidAt ??
                  new Date(),
              },
            });

          if (
            currentPayment.order.status ===
            OrderStatus.PENDING
          ) {
            await tx.order.update({
              where: {
                id: currentPayment.orderId,
              },
              data: {
                status:
                  OrderStatus.CONFIRMED,

                confirmedAt:
                  currentPayment.order
                    .confirmedAt ??
                  new Date(),
              },
            });
          }

          return updated;
        },
      );

    return {
      success: true,
      message:
        'Payment verified successfully',
      payment: updatedPayment,
    };
  }

  // =====================================================
  // RAZORPAY WEBHOOK
  // =====================================================

  async handleWebhook(
    rawBody: Buffer,
    signature: string,
    eventId: string,
  ) {
    // =================================================
    // 1. GET WEBHOOK SECRET
    // =================================================

    const webhookSecret =
      process.env
        .RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BadRequestException(
        'Razorpay webhook secret is missing',
      );
    }

    // =================================================
    // 2. VERIFY WEBHOOK SIGNATURE
    // =================================================

    const expectedSignature =
      crypto
        .createHmac(
          'sha256',
          webhookSecret,
        )
        .update(rawBody)
        .digest('hex');

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        'utf8',
      );

    const receivedBuffer =
      Buffer.from(
        signature,
        'utf8',
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      throw new BadRequestException(
        'Invalid Razorpay webhook signature',
      );
    }

    const signatureValid =
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer,
      );

    if (!signatureValid) {
      throw new BadRequestException(
        'Invalid Razorpay webhook signature',
      );
    }

    // =================================================
    // 3. DUPLICATE WEBHOOK CHECK
    // =================================================

    const existingEvent =
      await this.prisma.webhookEvent.findUnique({
        where: {
          eventId,
        },
      });

    if (existingEvent) {
      return {
        success: true,

        message:
          'Webhook already processed',
      };
    }

    // =================================================
    // 4. PARSE RAW BODY
    // =================================================

    let payload: any;

    try {
      payload =
        JSON.parse(
          rawBody.toString('utf8'),
        );
    } catch {
      throw new BadRequestException(
        'Invalid webhook payload',
      );
    }

    const event =
      payload?.event;

    if (!event) {
      throw new BadRequestException(
        'Webhook event is missing',
      );
    }

    // =================================================
    // 5. CREATE WEBHOOK EVENT
    // =================================================

    try {
      await this.prisma.webhookEvent.create({
        data: {
          eventId,

          event,

          processed: false,
        },
      });
    } catch (error: any) {
      // Unique constraint means another
      // request processed this event
      if (
        error?.code === 'P2002'
      ) {
        return {
          success: true,

          message:
            'Webhook already processed',
        };
      }

      throw error;
    }

    // =================================================
    // 6. PROCESS EVENT
    // =================================================

    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(
          payload,
        );
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(
          payload,
        );
        break;

      case 'refund.processed':
        await this.handleRefundProcessed(
          payload,
        );
        break;

      case 'refund.failed':
        await this.handleRefundFailed(
          payload,
        );
        break;

      default:
        // Unknown/unused Razorpay event
        break;
    }

    // =================================================
    // 7. MARK EVENT PROCESSED
    // =================================================

    await this.prisma.webhookEvent.update({
      where: {
        eventId,
      },

      data: {
        processed: true,

        processedAt:
          new Date(),
      },
    });

    return {
      success: true,

      message:
        'Webhook processed successfully',
    };
  }

  // =====================================================
  // PAYMENT CAPTURED
  // =====================================================

  private async handlePaymentCaptured(
    payload: any,
  ) {
    const paymentEntity =
      payload?.payload?.payment?.entity;

    if (!paymentEntity) {
      return;
    }

    const razorpayPaymentId =
      paymentEntity.id;

    const razorpayOrderId =
      paymentEntity.order_id;

    const razorpayStatus =
      paymentEntity.status;

    const razorpayAmount =
      paymentEntity.amount;

    if (
      !razorpayPaymentId ||
      !razorpayOrderId
    ) {
      return;
    }

    // Only captured payments can become SUCCESS.
    if (
      razorpayStatus &&
      razorpayStatus !== 'captured'
    ) {
      return;
    }

    const payment =
      await this.prisma.payment.findFirst({
        where: {
          gatewayOrderId:
            razorpayOrderId,

          method:
            PaymentMethod.ONLINE,
        },

        include: {
          order: true,
        },
      });

    if (!payment) {
      return;
    }

    // Never downgrade/overwrite an already successful payment.
    if (
      payment.status ===
      PaymentStatus.SUCCESS
    ) {
      return;
    }

    // ===================================================
    // AMOUNT VALIDATION
    // ===================================================

    const expectedAmountPaise =
      Math.round(
        Number(payment.amount) * 100,
      );

    if (
      Number(razorpayAmount) !==
      expectedAmountPaise
    ) {
      console.error(
        `Razorpay amount mismatch for payment ${payment.id}. ` +
        `Expected ${expectedAmountPaise}, received ${razorpayAmount}`,
      );

      return;
    }

    // ===================================================
    // ATOMIC PAYMENT + ORDER UPDATE
    // ===================================================

    await this.prisma.$transaction(
      async (tx) => {
        const currentPayment =
          await tx.payment.findUnique({
            where: {
              id: payment.id,
            },

            include: {
              order: true,
            },
          });

        if (!currentPayment) {
          return;
        }

        if (
          currentPayment.status ===
          PaymentStatus.SUCCESS
        ) {
          return;
        }

        await tx.payment.update({
          where: {
            id: currentPayment.id,
          },

          data: {
            status:
              PaymentStatus.SUCCESS,

            transactionId:
              razorpayPaymentId,

            gatewayPaymentId:
              razorpayPaymentId,

            paidAt:
              currentPayment.paidAt ??
              new Date(),
          },
        });

        if (
          currentPayment.order.status ===
          OrderStatus.PENDING
        ) {
          await tx.order.update({
            where: {
              id: currentPayment.orderId,
            },

            data: {
              status:
                OrderStatus.CONFIRMED,

              confirmedAt:
                currentPayment.order
                  .confirmedAt ??
                new Date(),
            },
          });
        }
      },
    );
  }

  // =====================================================
  // PAYMENT FAILED
  // =====================================================

  private async handlePaymentFailed(
    payload: any,
  ) {
    const paymentEntity =
      payload?.payload?.payment?.entity;

    if (!paymentEntity) {
      return;
    }

    const razorpayPaymentId =
      paymentEntity.id;

    const razorpayOrderId =
      paymentEntity.order_id;

    if (!razorpayOrderId) {
      return;
    }

    const payment =
      await this.prisma.payment.findFirst({
        where: {
          gatewayOrderId:
            razorpayOrderId,

          method:
            PaymentMethod.ONLINE,
        },
      });

    if (!payment) {
      return;
    }

    // Never downgrade a successful payment
    if (
      payment.status ===
      PaymentStatus.SUCCESS
    ) {
      return;
    }

    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        status:
          PaymentStatus.FAILED,

        transactionId:
          razorpayPaymentId ??
          null,
      },
    });
  }

  // =====================================================
  // REFUND PROCESSED
  // =====================================================

  private async handleRefundProcessed(
    payload: any,
  ) {
    const refundEntity =
      payload?.payload?.refund?.entity;

    if (!refundEntity) {
      return;
    }

    const razorpayPaymentId =
      refundEntity.payment_id;

    const refundId =
      refundEntity.id;

    const refundAmount =
      refundEntity.amount;

    if (
      !razorpayPaymentId ||
      !refundId ||
      !refundAmount
    ) {
      return;
    }

    const payment =
      await this.prisma.payment.findFirst({
        where: {
          gatewayPaymentId:
            razorpayPaymentId,
        },
      });

    if (!payment) {
      return;
    }

    // Razorpay gives refund amount in paise
    const currentRefundAmount =
      Number(refundAmount) / 100;

    const previouslyRefunded =
      Number(
        payment.refundedAmount,
      );

    const totalRefunded =
      previouslyRefunded +
      currentRefundAmount;

    const originalAmount =
      Number(payment.amount);

    const finalRefundedAmount =
      Math.min(
        totalRefunded,
        originalAmount,
      );

    const status =
      finalRefundedAmount >=
      originalAmount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        refundId,

        refundedAmount:
          finalRefundedAmount,

        status,
      },
    });

    // Full refund → order becomes REFUNDED
    if (
      status ===
      PaymentStatus.REFUNDED
    ) {
      await this.prisma.order.update({
        where: {
          id: payment.orderId,
        },

        data: {
          status:
            OrderStatus.REFUNDED,
        },
      });
    }
  }

  // =====================================================
  // REFUND FAILED
  // =====================================================

  private async handleRefundFailed(
    payload: any,
  ) {
    const refundEntity =
      payload?.payload?.refund?.entity;

    if (!refundEntity) {
      return;
    }

    const razorpayPaymentId =
      refundEntity.payment_id;

    if (!razorpayPaymentId) {
      return;
    }

    const payment =
      await this.prisma.payment.findFirst({
        where: {
          gatewayPaymentId:
            razorpayPaymentId,
        },
      });

    if (!payment) {
      return;
    }

    // We intentionally do not change
    // SUCCESS → FAILED here.
    //
    // The payment succeeded.
    // Only the refund attempt failed.
  }

  // =====================================================
  // ADMIN REFUND PAYMENT
  // =====================================================

  async refundPayment(
    paymentId: string,
    dto: CreateRefundDto,
  ) {
    // =================================================
    // 1. GET PAYMENT
    // =================================================

    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id: paymentId,
        },

        include: {
          order: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found',
      );
    }

    // =================================================
    // 2. ONLY ONLINE PAYMENT
    // =================================================

    if (
      payment.method !==
      PaymentMethod.ONLINE
    ) {
      throw new BadRequestException(
        'Only online payments can be refunded through Razorpay',
      );
    }

    // =================================================
    // 3. ONLY SUCCESSFUL PAYMENT
    // =================================================

    if (
      payment.status !==
        PaymentStatus.SUCCESS &&
      payment.status !==
        PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        'Only successful payments can be refunded',
      );
    }

    // =================================================
    // 4. RAZORPAY PAYMENT ID REQUIRED
    // =================================================

    if (
      !payment.gatewayPaymentId
    ) {
      throw new BadRequestException(
        'Razorpay payment ID not found',
      );
    }

    // =================================================
    // 5. CALCULATE REFUND
    // =================================================

    const originalAmount =
      Number(payment.amount);

    const alreadyRefunded =
      Number(
        payment.refundedAmount,
      );

    const remainingAmount =
      originalAmount -
      alreadyRefunded;

    const requestedAmount =
      dto.amount ??
      remainingAmount;

    if (
      requestedAmount <= 0
    ) {
      throw new BadRequestException(
        'Invalid refund amount',
      );
    }

    if (
      requestedAmount >
      remainingAmount
    ) {
      throw new BadRequestException(
        'Refund amount exceeds remaining refundable amount',
      );
    }

    // =================================================
    // 6. ₹ → PAISE
    // =================================================

    const refundInPaise =
      Math.round(
        requestedAmount * 100,
      );

    if (refundInPaise <= 0) {
      throw new BadRequestException(
        'Invalid refund amount',
      );
    }

    // =================================================
    // 7. CREATE RAZORPAY REFUND
    // =================================================

    const refund =
      await this.razorpay.payments.refund(
        payment.gatewayPaymentId,
        {
          amount:
            refundInPaise,
        },
      );

    // =================================================
    // 8. RETURN REFUND DETAILS
    // =================================================

    return {
      success: true,

      message:
        'Refund initiated successfully',

      refund: {
        id:
          refund.id,

        paymentId:
          payment.gatewayPaymentId,

        amount:
          requestedAmount,

        currency:
          'INR',

        status:
          refund.status,
      },
    };
  }

  // =====================================================
  // GET MY PAYMENT
  // =====================================================

  async getPayment(
    userId: string,
    paymentId: string,
  ) {
    const payment =
      await this.prisma.payment.findFirst({
        where: {
          id: paymentId,

          userId,
        },

        include: {
          order: {
            select: {
              id: true,

              orderNumber: true,

              status: true,

              total: true,
            },
          },
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found',
      );
    }

    return {
      success: true,

      payment,
    };
  }

  // =====================================================
  // GET ORDER PAYMENTS
  // =====================================================

  async getOrderPayments(
    userId: string,
    orderId: string,
  ) {
    const order =
      await this.prisma.order.findFirst({
        where: {
          id: orderId,

          userId,
        },

        select: {
          id: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Order not found',
      );
    }

    const payments =
      await this.prisma.payment.findMany({
        where: {
          orderId,

          userId,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      });

    return {
      success: true,

      count:
        payments.length,

      payments,
    };
  }
}