import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CouponType } from '../generated/prisma/client';

import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // CREATE COUPON - ADMIN
  // =====================================================

  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();

    const existingCoupon =
      await this.prisma.coupon.findUnique({
        where: {
          code,
        },
      });

    if (existingCoupon) {
      throw new ConflictException(
        'Coupon code already exists',
      );
    }

    // Percentage coupon cannot exceed 100%
    if (
      dto.type === CouponType.PERCENTAGE &&
      dto.value > 100
    ) {
      throw new BadRequestException(
        'Percentage discount cannot exceed 100%',
      );
    }

    const startsAt = dto.startsAt
      ? new Date(dto.startsAt)
      : undefined;

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : undefined;

    if (
      startsAt &&
      expiresAt &&
      expiresAt <= startsAt
    ) {
      throw new BadRequestException(
        'Expiry date must be after start date',
      );
    }

    const coupon =
      await this.prisma.coupon.create({
        data: {
          code,

          description:
            dto.description?.trim(),

          type: dto.type,

          value: dto.value,

          minOrderAmount:
            dto.minOrderAmount,

          maxDiscount:
            dto.maxDiscount,

          usageLimit:
            dto.usageLimit,

          startsAt,

          expiresAt,

          isActive: true,
        },
      });

    return coupon;
  }

  // =====================================================
  // GET ALL COUPONS - ADMIN
  // =====================================================

  async getCoupons() {
    const coupons =
      await this.prisma.coupon.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

    return {
      coupons,
      count: coupons.length,
    };
  }

  // =====================================================
  // GET AVAILABLE COUPONS - CUSTOMER
  // =====================================================

  async getAvailableCoupons() {
    const now = new Date();

    const coupons =
      await this.prisma.coupon.findMany({
        where: {
          isActive: true,

          OR: [
            {
              startsAt: null,
            },
            {
              startsAt: {
                lte: now,
              },
            },
          ],

          AND: [
            {
              OR: [
                {
                  expiresAt: null,
                },
                {
                  expiresAt: {
                    gte: now,
                  },
                },
              ],
            },
          ],
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    const availableCoupons =
      coupons.filter((coupon) => {
        if (coupon.usageLimit === null) {
          return true;
        }

        return (
          coupon.usedCount <
          coupon.usageLimit
        );
      });

    return {
      coupons: availableCoupons,
      count: availableCoupons.length,
    };
  }

  // =====================================================
  // GET SINGLE COUPON - ADMIN
  // =====================================================

  async getCoupon(id: string) {
    const coupon =
      await this.prisma.coupon.findUnique({
        where: {
          id,
        },
      });

    if (!coupon) {
      throw new NotFoundException(
        'Coupon not found',
      );
    }

    return coupon;
  }

  // =====================================================
  // UPDATE COUPON - ADMIN
  // =====================================================

  async updateCoupon(
    id: string,
    dto: UpdateCouponDto,
  ) {
    const existingCoupon =
      await this.prisma.coupon.findUnique({
        where: {
          id,
        },
      });

    if (!existingCoupon) {
      throw new NotFoundException(
        'Coupon not found',
      );
    }

    const code = dto.code
      ? dto.code.trim().toUpperCase()
      : undefined;

    if (code && code !== existingCoupon.code) {
      const duplicate =
        await this.prisma.coupon.findUnique({
          where: {
            code,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Coupon code already exists',
        );
      }
    }

    const finalType =
      dto.type ?? existingCoupon.type;

    const finalValue =
      dto.value ?? Number(existingCoupon.value);

    if (
      finalType === CouponType.PERCENTAGE &&
      finalValue > 100
    ) {
      throw new BadRequestException(
        'Percentage discount cannot exceed 100%',
      );
    }

    const startsAt =
      dto.startsAt !== undefined
        ? new Date(dto.startsAt)
        : existingCoupon.startsAt;

    const expiresAt =
      dto.expiresAt !== undefined
        ? new Date(dto.expiresAt)
        : existingCoupon.expiresAt;

    if (
      startsAt &&
      expiresAt &&
      expiresAt <= startsAt
    ) {
      throw new BadRequestException(
        'Expiry date must be after start date',
      );
    }

    const updatedCoupon =
      await this.prisma.coupon.update({
        where: {
          id,
        },

        data: {
          ...(code !== undefined && {
            code,
          }),

          ...(dto.description !== undefined && {
            description:
              dto.description.trim(),
          }),

          ...(dto.type !== undefined && {
            type: dto.type,
          }),

          ...(dto.value !== undefined && {
            value: dto.value,
          }),

          ...(dto.minOrderAmount !== undefined && {
            minOrderAmount:
              dto.minOrderAmount,
          }),

          ...(dto.maxDiscount !== undefined && {
            maxDiscount:
              dto.maxDiscount,
          }),

          ...(dto.usageLimit !== undefined && {
            usageLimit:
              dto.usageLimit,
          }),

          ...(dto.startsAt !== undefined && {
            startsAt: new Date(dto.startsAt),
          }),

          ...(dto.expiresAt !== undefined && {
            expiresAt: new Date(dto.expiresAt),
          }),

          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      });

    return updatedCoupon;
  }

  // =====================================================
  // DELETE / DEACTIVATE COUPON - ADMIN
  // =====================================================

  async deleteCoupon(id: string) {
    const coupon =
      await this.prisma.coupon.findUnique({
        where: {
          id,
        },
      });

    if (!coupon) {
      throw new NotFoundException(
        'Coupon not found',
      );
    }

    /*
     * We do NOT physically delete the coupon.
     *
     * Existing orders may reference this coupon.
     * Therefore we deactivate it instead.
     */

    const updatedCoupon =
      await this.prisma.coupon.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      });

    return {
      id: updatedCoupon.id,
      code: updatedCoupon.code,
      isActive: updatedCoupon.isActive,
    };
  }

  // =====================================================
  // VALIDATE COUPON - CUSTOMER
  // =====================================================

  async validateCoupon(
    dto: ValidateCouponDto,
  ) {
    const code = dto.code.trim().toUpperCase();

    const coupon =
      await this.prisma.coupon.findUnique({
        where: {
          code,
        },
      });

    if (!coupon) {
      throw new NotFoundException(
        'Invalid coupon code',
      );
    }

    if (!coupon.isActive) {
      throw new BadRequestException(
        'Coupon is inactive',
      );
    }

    const now = new Date();

    if (
      coupon.startsAt &&
      now < coupon.startsAt
    ) {
      throw new BadRequestException(
        'Coupon is not active yet',
      );
    }

    if (
      coupon.expiresAt &&
      now > coupon.expiresAt
    ) {
      throw new BadRequestException(
        'Coupon has expired',
      );
    }

    if (
      coupon.usageLimit !== null &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      throw new BadRequestException(
        'Coupon usage limit has been reached',
      );
    }

    const minOrderAmount =
      coupon.minOrderAmount
        ? Number(coupon.minOrderAmount)
        : 0;

    if (dto.cartAmount < minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount for this coupon is ₹${minOrderAmount.toFixed(2)}`,
      );
    }

    const cartAmount = dto.cartAmount;

    let discount = 0;

    if (coupon.type === CouponType.PERCENTAGE) {
      discount =
        (cartAmount *
          Number(coupon.value)) /
        100;
    } else {
      discount = Number(coupon.value);
    }

    // Never give discount greater than cart amount.
    discount = Math.min(
      discount,
      cartAmount,
    );

    // Apply maximum discount cap.
    if (coupon.maxDiscount !== null) {
      discount = Math.min(
        discount,
        Number(coupon.maxDiscount),
      );
    }

    discount = Math.max(
      0,
      Number(discount.toFixed(2)),
    );

    const finalAmount = Number(
      (cartAmount - discount).toFixed(2),
    );

    return {
      valid: true,

      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount:
          coupon.minOrderAmount,
        maxDiscount:
          coupon.maxDiscount,
      },

      calculation: {
        cartAmount,
        discount,
        finalAmount,
      },
    };
  }

  // =====================================================
  // INTERNAL COUPON CALCULATION
  // =====================================================
  //
  // OrderService will reuse this method.
  //
  // IMPORTANT:
  // We intentionally do NOT increase usedCount here.
  // Coupon usage should be consumed only after
  // successful order creation/payment flow.
  //
  // =====================================================

  async calculateCouponDiscount(
    code: string,
    cartAmount: number,
  ) {
    const result =
      await this.validateCoupon({
        code,
        cartAmount,
      });

    return result.calculation.discount;
  }
}
