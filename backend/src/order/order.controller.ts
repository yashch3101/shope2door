import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OrderService } from './order.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../generated/prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
  ) {}

  // =====================================================
  // CUSTOMER
  // =====================================================

  @Post()
  async createOrder(
    @CurrentUser() user: {
      id: string;
      email: string;
      role: string;
    },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(
      user.id,
      dto,
    );
  }

  @Get('my')
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.orderService.getMyOrders(
      userId,
      status as any,
    );
  }

  @Get('my/:id')
  async getMyOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.getMyOrder(
      userId,
      orderId,
    );
  }

  @Post(':id/cancel')
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.cancelOrder(
      userId,
      orderId,
    );
  }

  // =====================================================
  // ADMIN
  // =====================================================

  @Get('admin/all')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async getAllOrders(
    @Query('status') status?: string,
  ) {
    return this.orderService.getAllOrders(
      status as any,
    );
  }

  @Patch('admin/:id/status')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(
      orderId,
      dto,
    );
  }
}