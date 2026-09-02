import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
  ) {}

  @Get()
  async getCart(@Req() req: any) {
    return {
      success: true,
      message: 'Cart fetched successfully',
      data: await this.cartService.getCart(req.user.id),
    };
  }

  @Post('items')
  async addItem(
    @Req() req: any,
    @Body() dto: AddCartItemDto,
  ) {
    return {
      success: true,
      message: 'Product added to cart successfully',
      data: await this.cartService.addItem(
        req.user.id,
        dto.productId,
        dto.quantity,
      ),
    };
  }

  @Patch('items/:productId')
  async updateItem(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return {
      success: true,
      message: 'Cart item updated successfully',
      data: await this.cartService.updateItem(
        req.user.id,
        productId,
        dto.quantity,
      ),
    };
  }

  @Delete('items/:productId')
  async removeItem(
    @Req() req: any,
    @Param('productId') productId: string,
  ) {
    return {
      success: true,
      message: 'Product removed from cart successfully',
      data: await this.cartService.removeItem(
        req.user.id,
        productId,
      ),
    };
  }

  @Delete()
  async clearCart(@Req() req: any) {
    return {
      success: true,
      message: 'Cart cleared successfully',
      data: await this.cartService.clearCart(
        req.user.id,
      ),
    };
  }
}