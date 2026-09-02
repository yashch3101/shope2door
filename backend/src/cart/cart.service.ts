import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // GET CART
  // =====================================================

  async getCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: {
        userId,
      },

      create: {
        userId,
      },

      update: {},

      include: {
        items: {
          include: {
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
                images: true,
                isActive: true,
                categoryId: true,
              },
            },
          },

          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return this.buildCartResponse(cart);
  }

  // =====================================================
  // ADD ITEM
  // =====================================================

  async addItem(
    userId: string,
    productId: string,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        'Quantity must be at least 1',
      );
    }

    const product =
      await this.prisma.product.findFirst({
        where: {
          id: productId,
          isActive: true,
        },

        select: {
          id: true,
          name: true,
          price: true,
          mrp: true,
          stock: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found or unavailable',
      );
    }

    if (product.stock <= 0) {
      throw new BadRequestException(
        'Product is out of stock',
      );
    }

    const cart =
      await this.prisma.cart.upsert({
        where: {
          userId,
        },

        create: {
          userId,
        },

        update: {},
      });

    const existingItem =
      await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },

        select: {
          id: true,
          quantity: true,
        },
      });

    const finalQuantity =
      (existingItem?.quantity ?? 0) + quantity;

    if (finalQuantity > product.stock) {
      throw new BadRequestException(
        `Only ${product.stock} units are available`,
      );
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },

        data: {
          quantity: finalQuantity,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  // =====================================================
  // UPDATE ITEM QUANTITY
  // =====================================================

  async updateItem(
    userId: string,
    productId: string,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        'Quantity must be at least 1',
      );
    }

    const cart =
      await this.prisma.cart.findUnique({
        where: {
          userId,
        },
      });

    if (!cart) {
      throw new NotFoundException(
        'Cart not found',
      );
    }

    const item =
      await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },

        include: {
          product: {
            select: {
              id: true,
              name: true,
              stock: true,
              isActive: true,
            },
          },
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Product is not in your cart',
      );
    }

    if (!item.product.isActive) {
      throw new BadRequestException(
        'Product is no longer available',
      );
    }

    if (item.product.stock <= 0) {
      throw new BadRequestException(
        'Product is out of stock',
      );
    }

    if (quantity > item.product.stock) {
      throw new BadRequestException(
        `Only ${item.product.stock} units are available`,
      );
    }

    await this.prisma.cartItem.update({
      where: {
        id: item.id,
      },

      data: {
        quantity,
      },
    });

    return this.getCart(userId);
  }

  // =====================================================
  // REMOVE ITEM
  // =====================================================

  async removeItem(
    userId: string,
    productId: string,
  ) {
    const cart =
      await this.prisma.cart.findUnique({
        where: {
          userId,
        },
      });

    if (!cart) {
      throw new NotFoundException(
        'Cart not found',
      );
    }

    const item =
      await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },

        select: {
          id: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Product is not in your cart',
      );
    }

    await this.prisma.cartItem.delete({
      where: {
        id: item.id,
      },
    });

    return this.getCart(userId);
  }

  // =====================================================
  // CLEAR CART
  // =====================================================

  async clearCart(userId: string) {
    const cart =
      await this.prisma.cart.findUnique({
        where: {
          userId,
        },
      });

    if (!cart) {
      return {
        message: 'Cart is already empty',
      };
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return {
      message: 'Cart cleared successfully',
    };
  }

  // =====================================================
  // BUILD CART RESPONSE
  // =====================================================

  private buildCartResponse(cart: any) {
    let subtotal = 0;
    let totalMrp = 0;
    let totalItems = 0;

    const items = cart.items.map(
      (item: any) => {
        const price =
          Number(item.product.price);

        const mrp =
          Number(item.product.mrp);

        const itemTotal =
          price * item.quantity;

        const itemMrpTotal =
          mrp * item.quantity;

        subtotal += itemTotal;
        totalMrp += itemMrpTotal;
        totalItems += item.quantity;

        return {
          id: item.id,
          productId: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          quantity: item.quantity,

          price,
          mrp,

          itemTotal,
          itemMrpTotal,

          stock: item.product.stock,
          unit: item.product.unit,
          weight: item.product.weight,
          images: item.product.images,
          isActive: item.product.isActive,
          categoryId: item.product.categoryId,
        };
      },
    );

    return {
      cartId: cart.id,

      items,

      summary: {
        totalItems,
        subtotal,
        totalMrp,

        totalSavings:
          Math.max(
            0,
            totalMrp - subtotal,
          ),
      },
    };
  }
}