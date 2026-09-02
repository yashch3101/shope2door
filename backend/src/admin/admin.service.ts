import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  Product,
} from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';

@Injectable()
export class AdminService {
  // =====================================================
  // CONFIG
  // =====================================================

  private readonly LOW_STOCK_THRESHOLD = 5;

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // DASHBOARD
  // =====================================================

  async getDashboard() {
    const [
      totalUsers,
      activeUsers,

      totalProducts,
      activeProducts,
      lowStockProducts,

      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,

      successfulPayments,
      pendingPayments,
      failedPayments,

      revenueResult,
    ] = await Promise.all([
      // USERS
      this.prisma.user.count(),

      this.prisma.user.count({
        where: {
          isActive: true,
        },
      }),

      // PRODUCTS
      this.prisma.product.count(),

      this.prisma.product.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.product.count({
        where: {
          isActive: true,
          stock: {
            lte: this.LOW_STOCK_THRESHOLD,
          },
        },
      }),

      // ORDERS
      this.prisma.order.count(),

      this.prisma.order.count({
        where: {
          status: 'PENDING',
        },
      }),

      this.prisma.order.count({
        where: {
          status: 'PROCESSING',
        },
      }),

      this.prisma.order.count({
        where: {
          status: 'DELIVERED',
        },
      }),

      this.prisma.order.count({
        where: {
          status: 'CANCELLED',
        },
      }),

      // PAYMENTS
      this.prisma.payment.count({
        where: {
          status: 'SUCCESS',
        },
      }),

      this.prisma.payment.count({
        where: {
          status: 'PENDING',
        },
      }),

      this.prisma.payment.count({
        where: {
          status: 'FAILED',
        },
      }),

      // REVENUE
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'SUCCESS',
        },
      }),
    ]);

    const revenue =
      revenueResult._sum.amount?.toNumber() ?? 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },

      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
        lowStock: lowStockProducts,
      },

      orders: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },

      payments: {
        successful: successfulPayments,
        pending: pendingPayments,
        failed: failedPayments,
      },

      revenue,
    };
  }

  // =====================================================
  // CREATE PRODUCT
  // =====================================================

  async createProduct(
    dto: CreateAdminProductDto,
  ) {
    const name = dto.name.trim();
    const slug = dto.slug.trim().toLowerCase();
    const sku = dto.sku?.trim() || undefined;

    // ---------------------------------------------------
    // VALIDATE PRICE
    // ---------------------------------------------------

    if (dto.price > dto.mrp) {
      throw new ConflictException(
        'Selling price cannot be greater than MRP',
      );
    }

    // ---------------------------------------------------
    // VALIDATE CATEGORY
    // ---------------------------------------------------

    const category =
      await this.prisma.category.findUnique({
        where: {
          id: dto.categoryId,
        },
        select: {
          id: true,
          isActive: true,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    if (!category.isActive) {
      throw new ConflictException(
        'Cannot create product under an inactive category',
      );
    }

    // ---------------------------------------------------
    // CHECK SLUG / SKU
    // ---------------------------------------------------

    const existingProduct =
      await this.prisma.product.findFirst({
        where: {
          OR: [
            {
              slug,
            },
            ...(sku
              ? [
                  {
                    sku,
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          slug: true,
          sku: true,
        },
      });

    if (existingProduct) {
      if (existingProduct.slug === slug) {
        throw new ConflictException(
          'Product slug already exists',
        );
      }

      if (
        sku &&
        existingProduct.sku === sku
      ) {
        throw new ConflictException(
          'Product SKU already exists',
        );
      }
    }

    // ---------------------------------------------------
    // CREATE
    // ---------------------------------------------------

    const product =
      await this.prisma.product.create({
        data: {
          name,

          slug,

          description:
            dto.description?.trim() || null,

          price: new Prisma.Decimal(
            dto.price,
          ),

          mrp: new Prisma.Decimal(
            dto.mrp,
          ),

          costPrice:
            dto.costPrice !== undefined
              ? new Prisma.Decimal(
                  dto.costPrice,
                )
              : null,

          stock: dto.stock,

          unit:
            dto.unit?.trim() || null,

          weight:
            dto.weight?.trim() || null,

          brand:
            dto.brand?.trim() || null,

          sku,

          images: dto.images ?? [],

          isActive:
            dto.isActive ?? true,

          isFeatured:
            dto.isFeatured ?? false,

          categoryId:
            dto.categoryId,
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

    return this.serializeProduct(
      product,
    );
  }

  // =====================================================
  // GET ALL PRODUCTS
  // =====================================================

  async getProducts(
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const safePage = Math.max(
      1,
      Number(page) || 1,
    );

    const safeLimit = Math.min(
      100,
      Math.max(
        1,
        Number(limit) || 20,
      ),
    );

    const skip =
      (safePage - 1) * safeLimit;

    const where: Prisma.ProductWhereInput =
      {};

    // ---------------------------------------------------
    // SEARCH
    // ---------------------------------------------------

    if (search?.trim()) {
      const searchTerm =
        search.trim();

      where.OR = [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [
      products,
      total,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where,

        skip,

        take: safeLimit,

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      data: products.map(
        (product) =>
          this.serializeProduct(
            product,
          ),
      ),

      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(
          total / safeLimit,
        ),
      },
    };
  }

  // =====================================================
  // GET SINGLE PRODUCT
  // =====================================================

  async getProductById(
    productId: string,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return this.serializeProduct(
      product,
    );
  }

  // =====================================================
  // UPDATE PRODUCT
  // =====================================================

  async updateProduct(
    productId: string,
    dto: UpdateAdminProductDto,
  ) {
    // ---------------------------------------------------
    // FIND PRODUCT
    // ---------------------------------------------------

    const existingProduct =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!existingProduct) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    // ---------------------------------------------------
    // PRICE VALIDATION
    // ---------------------------------------------------

    const newPrice =
      dto.price ??
      Number(existingProduct.price);

    const newMrp =
      dto.mrp ??
      Number(existingProduct.mrp);

    if (newPrice > newMrp) {
      throw new ConflictException(
        'Selling price cannot be greater than MRP',
      );
    }

    // ---------------------------------------------------
    // CATEGORY VALIDATION
    // ---------------------------------------------------

    if (dto.categoryId) {
      const category =
        await this.prisma.category.findUnique({
          where: {
            id: dto.categoryId,
          },
          select: {
            id: true,
            isActive: true,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'Category not found',
        );
      }

      if (!category.isActive) {
        throw new ConflictException(
          'Cannot move product to an inactive category',
        );
      }
    }

    // ---------------------------------------------------
    // SLUG / SKU VALIDATION
    // ---------------------------------------------------

    const newSlug =
      dto.slug?.trim().toLowerCase();

    const newSku =
      dto.sku !== undefined
        ? dto.sku.trim() || null
        : undefined;

    if (
      newSlug ||
      dto.sku !== undefined
    ) {
      const duplicate =
        await this.prisma.product.findFirst({
          where: {
            id: {
              not: productId,
            },

            OR: [
              ...(newSlug
                ? [
                    {
                      slug: newSlug,
                    },
                  ]
                : []),

              ...(newSku
                ? [
                    {
                      sku: newSku,
                    },
                  ]
                : []),
            ],
          },

          select: {
            id: true,
            slug: true,
            sku: true,
          },
        });

      if (duplicate) {
        if (
          newSlug &&
          duplicate.slug === newSlug
        ) {
          throw new ConflictException(
            'Product slug already exists',
          );
        }

        if (
          newSku &&
          duplicate.sku === newSku
        ) {
          throw new ConflictException(
            'Product SKU already exists',
          );
        }
      }
    }

    // ---------------------------------------------------
    // BUILD UPDATE DATA
    // ---------------------------------------------------

    const data: Prisma.ProductUpdateInput =
      {};

    if (dto.name !== undefined) {
      data.name =
        dto.name.trim();
    }

    if (dto.slug !== undefined) {
      data.slug =
        dto.slug.trim().toLowerCase();
    }

    if (
      dto.description !== undefined
    ) {
      data.description =
        dto.description.trim() || null;
    }

    if (dto.price !== undefined) {
      data.price =
        new Prisma.Decimal(
          dto.price,
        );
    }

    if (dto.mrp !== undefined) {
      data.mrp =
        new Prisma.Decimal(
          dto.mrp,
        );
    }

    if (
      dto.costPrice !== undefined
    ) {
      data.costPrice =
        new Prisma.Decimal(
          dto.costPrice,
        );
    }

    if (dto.stock !== undefined) {
      data.stock =
        dto.stock;
    }

    if (dto.unit !== undefined) {
      data.unit =
        dto.unit.trim() || null;
    }

    if (dto.weight !== undefined) {
      data.weight =
        dto.weight.trim() || null;
    }

    if (dto.brand !== undefined) {
      data.brand =
        dto.brand.trim() || null;
    }

    if (dto.sku !== undefined) {
      data.sku =
        newSku ?? null;
    }

    if (dto.images !== undefined) {
      data.images =
        dto.images;
    }

    if (
      dto.isActive !== undefined
    ) {
      data.isActive =
        dto.isActive;
    }

    if (
      dto.isFeatured !== undefined
    ) {
      data.isFeatured =
        dto.isFeatured;
    }

    if (
      dto.categoryId !== undefined
    ) {
      data.category = {
        connect: {
          id: dto.categoryId,
        },
      };
    }

    // ---------------------------------------------------
    // UPDATE
    // ---------------------------------------------------

    try {
      const updatedProduct =
        await this.prisma.product.update({
          where: {
            id: productId,
          },

          data,

          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

      return this.serializeProduct(
        updatedProduct,
      );
    } catch (error) {
      this.handlePrismaError(
        error,
        'Unable to update product',
      );
    }
  }

  // =====================================================
  // SOFT DELETE PRODUCT
  // =====================================================

  async deleteProduct(
    productId: string,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    // ---------------------------------------------------
    // SOFT DELETE
    // ---------------------------------------------------

    const updatedProduct =
      await this.prisma.product.update({
        where: {
          id: productId,
        },

        data: {
          isActive: false,
        },

        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

    return {
      message:
        'Product deactivated successfully',

      product: updatedProduct,
    };
  }

  // =====================================================
  // RESTORE PRODUCT
  // =====================================================

  async restoreProduct(
    productId: string,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    if (product.isActive) {
      throw new ConflictException(
        'Product is already active',
      );
    }

    const updatedProduct =
      await this.prisma.product.update({
        where: {
          id: productId,
        },

        data: {
          isActive: true,
        },

        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

    return {
      message:
        'Product activated successfully',

      product: updatedProduct,
    };
  }

  // =====================================================
  // UPDATE STOCK
  // =====================================================

  async updateProductStock(
    productId: string,
    stock: number,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          name: true,
          stock: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    const updatedProduct =
      await this.prisma.product.update({
        where: {
          id: productId,
        },

        data: {
          stock,
        },

        select: {
          id: true,
          name: true,
          stock: true,
          updatedAt: true,
        },
      });

    return {
      message:
        'Product stock updated successfully',

      product: updatedProduct,
    };
  }

  // =====================================================
  // SERIALIZE PRODUCT
  // =====================================================

  private serializeProduct(
    product: Product & {
      category?: {
        id: string;
        name: string;
        slug: string;
        isActive?: boolean;
      };
    },
  ) {
    return {
      id: product.id,

      name: product.name,

      slug: product.slug,

      description:
        product.description,

      price:
        product.price.toNumber(),

      mrp:
        product.mrp.toNumber(),

      costPrice:
        product.costPrice?.toNumber() ??
        null,

      stock:
        product.stock,

      unit:
        product.unit,

      weight:
        product.weight,

      brand:
        product.brand,

      sku:
        product.sku,

      images:
        product.images,

      isActive:
        product.isActive,

      isFeatured:
        product.isFeatured,

      category:
        product.category ?? null,

      createdAt:
        product.createdAt,

      updatedAt:
        product.updatedAt,
    };
  }

  // =====================================================
  // PRISMA ERROR HANDLER
  // =====================================================

  private handlePrismaError(
    error: unknown,
    fallbackMessage: string,
  ): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A unique product field already exists',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Product not found',
        );
      }
    }

    throw error;
  }
}