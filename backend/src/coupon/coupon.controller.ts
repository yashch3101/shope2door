import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CouponService } from './coupon.service';

import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../generated/prisma/client';

@Controller('coupons')
export class CouponController {
  constructor(
    private readonly couponService: CouponService,
  ) {}

  // =====================================================
  // CUSTOMER
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
  ) {
    return {
      success: true,
      message: 'Coupon validated successfully',
      data:
        await this.couponService.validateCoupon(
          dto,
        ),
    };
  }

  // =====================================================
  // GET AVAILABLE COUPONS - CUSTOMER
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Get('available')
  async getAvailableCoupons() {
    return {
      success: true,
      message: 'Available coupons fetched successfully',
      data:
        await this.couponService.getAvailableCoupons(),
    };
  }

  // =====================================================
  // ADMIN
  // =====================================================

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  @Post()
  async createCoupon(
    @Body() dto: CreateCouponDto,
  ) {
    return {
      success: true,
      message: 'Coupon created successfully',
      data:
        await this.couponService.createCoupon(
          dto,
        ),
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  @Get()
  async getCoupons() {
    return {
      success: true,
      message: 'Coupons fetched successfully',
      data:
        await this.couponService.getCoupons(),
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getCoupon(
    @Param('id') id: string,
  ) {
    return {
      success: true,
      message: 'Coupon fetched successfully',
      data:
        await this.couponService.getCoupon(
          id,
        ),
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return {
      success: true,
      message: 'Coupon updated successfully',
      data:
        await this.couponService.updateCoupon(
          id,
          dto,
        ),
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteCoupon(
    @Param('id') id: string,
  ) {
    return {
      success: true,
      message: 'Coupon deactivated successfully',
      data:
        await this.couponService.deleteCoupon(
          id,
        ),
    };
  }
}