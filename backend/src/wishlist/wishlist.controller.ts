import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WishlistService } from './wishlist.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(
    private readonly wishlistService: WishlistService,
  ) {}

  // =====================================================
  // GET MY WISHLIST
  // GET /api/v1/wishlist
  // =====================================================

  @Get()
  async getWishlist(
    @CurrentUser('id') userId: string,
  ) {
    const data =
      await this.wishlistService.getWishlist(userId);

    return {
      success: true,
      message: 'Wishlist fetched successfully',
      data,
    };
  }

  // =====================================================
  // CHECK PRODUCT
  // GET /api/v1/wishlist/:productId
  // =====================================================

  @Get(':productId')
  async isInWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    const data =
      await this.wishlistService.isInWishlist(
        userId,
        productId,
      );

    return {
      success: true,
      message: 'Wishlist status fetched successfully',
      data,
    };
  }

  // =====================================================
  // ADD PRODUCT
  // POST /api/v1/wishlist/:productId
  // =====================================================

  @Post(':productId')
  async addToWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    const data =
      await this.wishlistService.addToWishlist(
        userId,
        productId,
      );

    return {
      success: true,
      message: 'Product added to wishlist successfully',
      data,
    };
  }

  // =====================================================
  // REMOVE PRODUCT
  // DELETE /api/v1/wishlist/:productId
  // =====================================================

  @Delete(':productId')
  async removeFromWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    const data =
      await this.wishlistService.removeFromWishlist(
        userId,
        productId,
      );

    return {
      success: true,
      message: 'Product removed from wishlist successfully',
      data,
    };
  }

  // =====================================================
  // CLEAR WISHLIST
  // DELETE /api/v1/wishlist
  // =====================================================

  @Delete()
  async clearWishlist(
    @CurrentUser('id') userId: string,
  ) {
    const data =
      await this.wishlistService.clearWishlist(userId);

    return {
      success: true,
      message: 'Wishlist cleared successfully',
      data,
    };
  }
}