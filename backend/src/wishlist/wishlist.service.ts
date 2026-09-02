import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // GET USER WISHLIST
  // =====================================================

  async getWishlist(userId: string) {
    const items =
      await this.prisma.wishlistItem.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: 'desc',
        },

        select: {
          id: true,
          userId: true,
          productId: true,
          createdAt: true,

          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              price: true,
              mrp: true,
              stock: true,
              unit: true,
              weight: true,
              brand: true,
              sku: true,
              images: true,
              isActive: true,
              isFeatured: true,

              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

    return {
      items,
      count: items.length,
    };
  }

  // =====================================================
  // CHECK PRODUCT IN WISHLIST
  // =====================================================

  async isInWishlist(
    userId: string,
    productId: string,
  ) {
    const item =
      await this.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },

        select: {
          id: true,
        },
      });

    return {
      productId,
      isInWishlist: !!item,
    };
  }

  // =====================================================
  // ADD PRODUCT TO WISHLIST
  // =====================================================

  async addToWishlist(
    userId: string,
    productId: string,
  ) {
    // ---------------------------------------------------
    // 1. Verify product exists
    // ---------------------------------------------------

    const product =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    // ---------------------------------------------------
    // 2. Inactive products cannot be newly wishlisted
    // ---------------------------------------------------

    if (!product.isActive) {
      throw new NotFoundException(
        'Product is no longer available',
      );
    }

    // ---------------------------------------------------
    // 3. Check existing wishlist item
    // ---------------------------------------------------

    const existingItem =
      await this.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },

        select: {
          id: true,
        },
      });

    if (existingItem) {
      throw new ConflictException(
        'Product is already in wishlist',
      );
    }

    // ---------------------------------------------------
    // 4. Create wishlist item
    // ---------------------------------------------------

    try {
      const item =
        await this.prisma.wishlistItem.create({
          data: {
            userId,
            productId,
          },

          select: {
            id: true,
            createdAt: true,

            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                mrp: true,
                stock: true,
                unit: true,
                weight: true,
                brand: true,
                sku: true,
                images: true,
                isActive: true,
                isFeatured: true,
              },
            },
          },
        });

      return item;
    } catch (error: any) {
      // Database unique constraint protection
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Product is already in wishlist',
        );
      }

      throw error;
    }
  }

  // =====================================================
  // REMOVE PRODUCT FROM WISHLIST
  // =====================================================

  async removeFromWishlist(
    userId: string,
    productId: string,
  ) {
    const existingItem =
      await this.prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

    if (!existingItem) {
      throw new NotFoundException(
        'Product is not in wishlist',
      );
    }

    await this.prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return {
      productId,
      removed: true,
    };
  }

  // =====================================================
  // CLEAR WISHLIST
  // =====================================================

  async clearWishlist(
    userId: string,
  ) {
    const result =
      await this.prisma.wishlistItem.deleteMany({
        where: {
          userId,
        },
      });

    return {
      removedCount: result.count,
    };
  }
}