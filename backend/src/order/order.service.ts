import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // CREATE ORDER
  // =====================================================

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // =================================================
        // 1. GET USER
        // =================================================

        const user =
          await tx.user.findUnique({
            where: {
              id: userId,
            },
          });

        if (!user || !user.isActive) {
          throw new BadRequestException(
            'User account is inactive or not found',
          );
        }

        // =================================================
        // 2. GET ADDRESS
        // =================================================

        const address =
          await tx.address.findFirst({
            where: {
              id: dto.addressId,
              userId,
            },
          });

        if (!address) {
          throw new NotFoundException(
            'Delivery address not found',
          );
        }

        // =================================================
        // 3. GET CART
        // =================================================

        const cart =
          await tx.cart.findUnique({
            where: {
              userId,
            },

            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          });

        if (
          !cart ||
          cart.items.length === 0
        ) {
          throw new BadRequestException(
            'Your cart is empty',
          );
        }

        // =================================================
        // 4. VERIFY PRODUCTS + STOCK
        // =================================================

        let subtotal = 0;

        const orderItemsData: Prisma.OrderItemCreateWithoutOrderInput[] =
          [];

        for (const cartItem of cart.items) {
          const product = cartItem.product;

          // Product must be active.
          if (!product.isActive) {
            throw new BadRequestException(
              `Product "${product.name}" is no longer available`,
            );
          }

          // Quantity must be valid.
          if (cartItem.quantity <= 0) {
            throw new BadRequestException(
              `Invalid quantity for "${product.name}"`,
            );
          }

          // Stock verification.
          if (
            product.stock <
            cartItem.quantity
          ) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name}". Available stock: ${product.stock}`,
            );
          }

          // Backend calculates price.
          const unitPrice =
            Number(product.price);

          const mrp =
            Number(product.mrp);

          const itemTotal =
            unitPrice *
            cartItem.quantity;

          subtotal += itemTotal;

          orderItemsData.push({
            quantity:
              cartItem.quantity,

            unitPrice:
              new Prisma.Decimal(
                unitPrice,
              ),

            mrp:
              new Prisma.Decimal(
                mrp,
              ),

            total:
              new Prisma.Decimal(
                itemTotal,
              ),

            productName:
              product.name,

            productSku:
              product.sku,

            productImage:
              product.images?.[0] ??
              null,

            product: {
              connect: {
                id: product.id,
              },
            },
          });
        }

        subtotal = Number(
          subtotal.toFixed(2),
        );

        // =================================================
        // 5. COUPON
        // =================================================

        let discount = 0;

        let couponId:
          | string
          | undefined;

        if (dto.couponCode) {
          const code =
            dto.couponCode
              .trim()
              .toUpperCase();

          const coupon =
            await tx.coupon.findUnique({
              where: {
                code,
              },
            });

          if (!coupon) {
            throw new BadRequestException(
              'Invalid coupon code',
            );
          }

          if (!coupon.isActive) {
            throw new BadRequestException(
              'Coupon is inactive',
            );
          }

          const now =
            new Date();

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
            coupon.usageLimit !==
              null &&
            coupon.usedCount >=
              coupon.usageLimit
          ) {
            throw new BadRequestException(
              'Coupon usage limit has been reached',
            );
          }

          const minOrderAmount =
            coupon.minOrderAmount
              ? Number(
                  coupon.minOrderAmount,
                )
              : 0;

          if (
            subtotal <
            minOrderAmount
          ) {
            throw new BadRequestException(
              `Minimum order amount is ₹${minOrderAmount.toFixed(2)}`,
            );
          }

          // Percentage coupon.
          if (
            coupon.type ===
            'PERCENTAGE'
          ) {
            discount =
              (subtotal *
                Number(
                  coupon.value,
                )) /
              100;
          }

          // Fixed coupon.
          else {
            discount =
              Number(coupon.value);
          }

          // Discount cannot exceed subtotal.
          discount = Math.min(
            discount,
            subtotal,
          );

          // Apply maximum discount limit.
          if (
            coupon.maxDiscount !==
              null
          ) {
            discount = Math.min(
              discount,
              Number(
                coupon.maxDiscount,
              ),
            );
          }

          discount = Number(
            discount.toFixed(2),
          );

          couponId =
            coupon.id;
        }

        // =================================================
        // 6. DELIVERY FEE
        // =================================================

        const deliveryFee = 0;

        // =================================================
        // 7. TAX
        // =================================================

        const tax = 0;

        // =================================================
        // 8. FINAL TOTAL
        // =================================================

        const total = Number(
          (
            subtotal -
            discount +
            deliveryFee +
            tax
          ).toFixed(2),
        );

        if (total < 0) {
          throw new BadRequestException(
            'Invalid order total',
          );
        }

        // =================================================
        // 9. GENERATE ORDER NUMBER
        // =================================================

        const orderNumber =
          await this.generateUniqueOrderNumber(
            tx,
          );

        // =================================================
        // 10. CREATE ORDER
        // =================================================

        const order =
          await tx.order.create({
            data: {
              orderNumber,

              status:
                OrderStatus.PENDING,

              subtotal:
                new Prisma.Decimal(
                  subtotal,
                ),

              discount:
                new Prisma.Decimal(
                  discount,
                ),

              deliveryFee:
                new Prisma.Decimal(
                  deliveryFee,
                ),

              tax:
                new Prisma.Decimal(
                  tax,
                ),

              total:
                new Prisma.Decimal(
                  total,
                ),

              customerName:
                user.name,

              customerPhone:
                user.phone ?? '',

              customerEmail:
                user.email,

              address: {
                connect: {
                  id: address.id,
                },
              },

              user: {
                connect: {
                  id: user.id,
                },
              },

              ...(couponId
                ? {
                    coupon: {
                      connect: {
                        id: couponId,
                      },
                    },
                  }
                : {}),

              notes:
                dto.notes?.trim(),

              items: {
                create:
                  orderItemsData,
              },
            },

            include: {
              items: true,

              address: true,

              coupon: true,
            },
          });

        // =================================================
        // 11. ATOMIC STOCK DECREMENT
        // =================================================

        for (const cartItem of cart.items) {
          const stockUpdate =
            await tx.product.updateMany({
              where: {
                id: cartItem.productId,

                isActive: true,

                stock: {
                  gte:
                    cartItem.quantity,
                },
              },

              data: {
                stock: {
                  decrement:
                    cartItem.quantity,
                },
              },
            });

          if (
            stockUpdate.count !== 1
          ) {
            throw new BadRequestException(
              `Stock changed for "${cartItem.product.name}". Please review your cart and try again.`,
            );
          }
        }

        // =================================================
        // 12. INCREMENT COUPON USAGE
        // =================================================

        if (couponId) {
          const coupon =
            await tx.coupon.findUnique({
              where: {
                id: couponId,
              },

              select: {
                usageLimit: true,
                usedCount: true,
                isActive: true,
              },
            });

          if (
            !coupon ||
            !coupon.isActive
          ) {
            throw new BadRequestException(
              'Coupon could not be applied',
            );
          }

          if (
            coupon.usageLimit !==
              null &&
            coupon.usedCount >=
              coupon.usageLimit
          ) {
            throw new BadRequestException(
              'Coupon usage limit has been reached',
            );
          }

          await tx.coupon.update({
            where: {
              id: couponId,
            },

            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }

        // =================================================
        // 13. CLEAR CART
        // =================================================

        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });

        // =================================================
        // 14. RETURN ORDER
        // =================================================

        return {
          success: true,
          message: 'Order created successfully',
          data: order,
        };
      },

      {
        maxWait: 5000,

        timeout: 15000,

        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  // =====================================================
  // GET CUSTOMER ORDERS
  // =====================================================

  async getMyOrders(
    userId: string,
    status?: OrderStatus,
  ) {
    const orders =
      await this.prisma.order.findMany({
        where: {
          userId,

          ...(status
            ? {
                status,
              }
            : {}),
        },

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          items: true,

          address: true,

          payments: true,

          coupon: true,
        },
      });

    return {
      success: true,
      message: 'Orders fetched successfully',
      data: orders,
    };
  }

  // =====================================================
  // GET SINGLE CUSTOMER ORDER
  // =====================================================

  async getMyOrder(
    userId: string,
    orderId: string,
  ) {
    const order =
      await this.prisma.order.findFirst({
        where: {
          id: orderId,

          userId,
        },

        include: {
          items: true,

          address: true,

          payments: true,

          coupon: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Order not found',
      );
    }

    return {
      success: true,
      message: 'Order fetched successfully',
      data: order,
    };
  }

  // =====================================================
  // CANCEL ORDER - CUSTOMER
  // =====================================================

  async cancelOrder(
    userId: string,
    orderId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order =
          await tx.order.findFirst({
            where: {
              id: orderId,

              userId,
            },

            include: {
              items: true,
            },
          });

        if (!order) {
          throw new NotFoundException(
            'Order not found',
          );
        }

        // =================================================
        // FIX:
        // Explicitly tell TypeScript this is OrderStatus[]
        // =================================================

        const cancellableStatuses: OrderStatus[] =
          [
            OrderStatus.PENDING,

            OrderStatus.CONFIRMED,

            OrderStatus.PROCESSING,

            OrderStatus.PACKED,
          ];

        if (
          !cancellableStatuses.includes(
            order.status,
          )
        ) {
          throw new BadRequestException(
            'This order can no longer be cancelled',
          );
        }

        // =================================================
        // UPDATE ORDER
        // =================================================

        const updatedOrder =
          await tx.order.update({
            where: {
              id: order.id,
            },

            data: {
              status:
                OrderStatus.CANCELLED,

              cancelledAt:
                new Date(),
            },
          });

        // =================================================
        // RESTORE INVENTORY
        // =================================================

        for (const item of order.items) {
          await tx.product.update({
            where: {
              id: item.productId,
            },

            data: {
              stock: {
                increment:
                  item.quantity,
              },
            },
          });
        }

        // =================================================
        // RESTORE COUPON USAGE
        // =================================================

        if (order.couponId) {
          await tx.coupon.updateMany({
            where: {
              id: order.couponId,

              usedCount: {
                gt: 0,
              },
            },

            data: {
              usedCount: {
                decrement: 1,
              },
            },
          });
        }

        return {
          success: true,

          message:
            'Order cancelled successfully',

          order: updatedOrder,
        };
      },

      {
        maxWait: 5000,

        timeout: 15000,

        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  // =====================================================
  // ADMIN — GET ALL ORDERS
  // =====================================================

  async getAllOrders(
    status?: OrderStatus,
  ) {
    const orders =
      await this.prisma.order.findMany({
        where: {
          ...(status
            ? {
                status,
              }
            : {}),
        },

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          user: {
            select: {
              id: true,

              name: true,

              email: true,

              phone: true,
            },
          },

          items: true,

          address: true,

          payments: true,

          coupon: true,
        },
      });

    return {
      success: true,

      count: orders.length,

      orders,
    };
  }

  // =====================================================
  // ADMIN — UPDATE ORDER STATUS
  // =====================================================

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: {
            id: orderId,
          },

          include: {
            items: true,
          },
        });

        if (!order) {
          throw new NotFoundException(
            'Order not found',
          );
        }

        this.validateStatusTransition(
          order.status,
          dto.status,
        );

        const data: Prisma.OrderUpdateInput = {
          status: dto.status,
        };

        if (
          dto.status ===
          OrderStatus.CONFIRMED
        ) {
          data.confirmedAt = new Date();
        }

        if (
          dto.status ===
          OrderStatus.DELIVERED
        ) {
          data.deliveredAt = new Date();
        }

        if (
          dto.status ===
          OrderStatus.CANCELLED
        ) {
          data.cancelledAt = new Date();
        }

        const updatedOrder =
          await tx.order.update({
            where: {
              id: orderId,
            },

            data,

            include: {
              items: true,
              address: true,
            },
          });

        // ============================================
        // ADMIN CANCELLATION → RESTORE STOCK
        // ============================================

        if (
          dto.status ===
          OrderStatus.CANCELLED
        ) {
          for (const item of order.items) {
            await tx.product.update({
              where: {
                id: item.productId,
              },

              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }

          // ==========================================
          // RESTORE COUPON USAGE
          // ==========================================

          if (order.couponId) {
            await tx.coupon.updateMany({
              where: {
                id: order.couponId,

                usedCount: {
                  gt: 0,
                },
              },

              data: {
                usedCount: {
                  decrement: 1,
                },
              },
            });
          }
        }

        return {
          success: true,

          message: 'Order status updated successfully',

          order: updatedOrder,
        };
      },

      {
        maxWait: 5000,

        timeout: 15000,

        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  // =====================================================
  // STATUS TRANSITION VALIDATION
  // =====================================================

  private validateStatusTransition(
    current: OrderStatus,

    next: OrderStatus,
  ) {
    if (current === next) {
      throw new BadRequestException(
        'Order already has this status',
      );
    }

    const allowedTransitions: Record<
      OrderStatus,
      OrderStatus[]
    > = {
      [OrderStatus.PENDING]: [
        OrderStatus.CONFIRMED,

        OrderStatus.CANCELLED,
      ],

      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,

        OrderStatus.CANCELLED,
      ],

      [OrderStatus.PROCESSING]: [
        OrderStatus.PACKED,

        OrderStatus.CANCELLED,
      ],

      [OrderStatus.PACKED]: [
        OrderStatus.DISPATCHED,

        OrderStatus.CANCELLED,
      ],

      [OrderStatus.DISPATCHED]: [
        OrderStatus.OUT_FOR_DELIVERY,
      ],

      [OrderStatus.OUT_FOR_DELIVERY]: [
        OrderStatus.DELIVERED,
      ],

      [OrderStatus.DELIVERED]: [
        OrderStatus.RETURN_REQUESTED,
      ],

      [OrderStatus.CANCELLED]: [],

      [OrderStatus.RETURN_REQUESTED]: [
        OrderStatus.RETURNED,

        OrderStatus.REFUNDED,
      ],

      [OrderStatus.RETURNED]: [
        OrderStatus.REFUNDED,
      ],

      [OrderStatus.REFUNDED]: [],
    };

    const allowed =
      allowedTransitions[current];

    if (
      !allowed ||
      !allowed.includes(next)
    ) {
      throw new BadRequestException(
        `Invalid order status transition: ${current} → ${next}`,
      );
    }
  }

  // =====================================================
  // EXPIRE UNPAID ONLINE ORDERS
  // =====================================================

  async expirePendingOnlineOrders() {
    const expiryMinutes = 30;

    const expiryTime = new Date(
      Date.now() -
        expiryMinutes * 60 * 1000,
    );

    const orders =
      await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,

          createdAt: {
            lt: expiryTime,
          },

          payments: {
            some: {
              method: PaymentMethod.ONLINE,
              status: {
                in: [
                  PaymentStatus.PENDING,
                  PaymentStatus.FAILED,
                ],
              },
            },
          },
        },

        include: {
          items: true,
        },
      });

    let expiredCount = 0;

    for (const order of orders) {
      await this.prisma.$transaction(
        async (tx) => {
          const currentOrder =
            await tx.order.findUnique({
              where: {
                id: order.id,
              },

              include: {
                items: true,
              },
            });

          if (!currentOrder) {
            return;
          }

          // Order may have been paid/cancelled
          // while this job was running.
          if (
            currentOrder.status !==
            OrderStatus.PENDING
          ) {
            return;
          }

          const successfulPayment =
            await tx.payment.findFirst({
              where: {
                orderId:
                  currentOrder.id,

                method: PaymentMethod.ONLINE,

                status: PaymentStatus.SUCCESS,
              },
            });

          // Never cancel a successfully paid order.
          if (successfulPayment) {
            return;
          }

          await tx.order.update({
            where: {
              id: currentOrder.id,
            },

            data: {
              status:
                OrderStatus.CANCELLED,

              cancelledAt:
                new Date(),
            },
          });

          // Restore stock
          for (
            const item of currentOrder.items
          ) {
            await tx.product.update({
              where: {
                id: item.productId,
              },

              data: {
                stock: {
                  increment:
                    item.quantity,
                },
              },
            });
          }

          // Restore coupon usage
          if (
            currentOrder.couponId
          ) {
            await tx.coupon.updateMany({
              where: {
                id:
                  currentOrder.couponId,

                usedCount: {
                  gt: 0,
                },
              },

              data: {
                usedCount: {
                  decrement: 1,
                },
              },
            });
          }

          expiredCount++;
        },
        {
          maxWait: 5000,
          timeout: 15000,
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    }

    return {
      expiredCount,
    };
  }

  // =====================================================
  // UNIQUE ORDER NUMBER
  // =====================================================

  private async generateUniqueOrderNumber(
    tx: Prisma.TransactionClient,
  ) {
    for (
      let attempt = 0;
      attempt < 5;
      attempt++
    ) {
      const timestamp =
        Date.now()
          .toString()
          .slice(-8);

      const random =
        Math.floor(
          1000 +
            Math.random() * 9000,
        );

      const orderNumber =
        `S2D-${timestamp}-${random}`;

      const existing =
        await tx.order.findUnique({
          where: {
            orderNumber,
          },

          select: {
            id: true,
          },
        });

      if (!existing) {
        return orderNumber;
      }
    }

    throw new BadRequestException(
      'Unable to generate unique order number',
    );
  }
}