import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // CREATE PRODUCT
  // =====================================================

  async create(dto: CreateProductDto) {
    const name = dto.name.trim();

    const slug = dto.slug
      .trim()
      .toLowerCase();

    // ---------------------------------------------
    // Validate price
    // ---------------------------------------------

    if (dto.price > dto.mrp) {
      throw new ConflictException(
        'Selling price cannot be greater than MRP',
      );
    }

    // ---------------------------------------------
    // Check category
    // ---------------------------------------------

    const category =
      await this.prisma.category.findUnique({
        where: {
          id: dto.categoryId,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    if (!category.isActive) {
      throw new ConflictException(
        'Cannot add product to inactive category',
      );
    }

    // ---------------------------------------------
    // Check duplicate slug
    // ---------------------------------------------

    const existingSlug =
      await this.prisma.product.findUnique({
        where: {
          slug,
        },
      });

    if (existingSlug) {
      throw new ConflictException(
        'Product slug already exists',
      );
    }

    // ---------------------------------------------
    // Check SKU
    // ---------------------------------------------

    const normalizedSku =
      dto.sku?.trim() || null;

    if (normalizedSku) {
      const existingSku =
        await this.prisma.product.findUnique({
          where: {
            sku: normalizedSku,
          },
        });

      if (existingSku) {
        throw new ConflictException(
          'Product SKU already exists',
        );
      }
    }

    // ---------------------------------------------
    // Create product
    // ---------------------------------------------

    const product =
      await this.prisma.product.create({
        data: {
          name,

          slug,

          description:
            dto.description?.trim() || null,

          price: dto.price,

          mrp: dto.mrp,

          costPrice:
            dto.costPrice ?? null,

          stock: dto.stock,

          unit:
            dto.unit?.trim() || null,

          weight:
            dto.weight?.trim() || null,

          brand:
            dto.brand?.trim() || null,

          sku: normalizedSku,

          images: dto.images ?? [],

          categoryId:
            dto.categoryId,

          isActive:
            dto.isActive ?? true,

          isFeatured:
            dto.isFeatured ?? false,
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          variants: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          productImages: {
            orderBy: [
              {
                sortOrder: 'asc',
              },
              {
                createdAt: 'asc',
              },
            ],
          },

          productInfo: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          productHighlights: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

    return product;
  }

  // =====================================================
  // CUSTOMER — GET PRODUCTS
  // =====================================================

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    categoryId?: string,
  ) {
    const safePage =
      Math.max(1, page);

    const safeLimit =
      Math.min(
        Math.max(1, limit),
        50,
      );

    const skip =
      (safePage - 1) *
      safeLimit;

    const where: any = {
      isActive: true,
    };

    // ---------------------------------------------
    // Search
    // ---------------------------------------------

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
      ];
    }

    // ---------------------------------------------
    // Category filter
    // ---------------------------------------------

    if (categoryId) {
      where.categoryId =
        categoryId;
    }

    // ---------------------------------------------
    // Parallel DB queries
    // ---------------------------------------------

    const [
      products,
      total,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where,

        skip,

        take: safeLimit,

        orderBy: [
          {
            isFeatured:
              'desc',
          },
          {
            createdAt:
              'desc',
          },
        ],

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
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      products,

      pagination: {
        page: safePage,

        limit: safeLimit,

        total,

        totalPages:
          Math.ceil(
            total /
              safeLimit,
          ),

        hasNextPage:
          safePage *
            safeLimit <
          total,

        hasPreviousPage:
          safePage > 1,
      },
    };
  }

  // =====================================================
  // CUSTOMER — GET PRODUCT BY ID
  // =====================================================

  async findById(id: string) {
    const product =
      await this.prisma.product.findFirst({
        where: {
          id,
          isActive: true,
        },

        select: {
          // -------------------------------------------
          // MAIN PRODUCT
          // -------------------------------------------

          id: true,

          legacyId: true,

          name: true,

          slug: true,

          description: true,

          legacyTypes: true,

          // -------------------------------------------
          // PRICING
          // -------------------------------------------

          price: true,

          mrp: true,

          costPrice: true,

          // -------------------------------------------
          // INVENTORY
          // -------------------------------------------

          stock: true,

          unit: true,

          weight: true,

          // -------------------------------------------
          // PRODUCT INFORMATION
          // -------------------------------------------

          brand: true,

          sku: true,

          images: true,

          // -------------------------------------------
          // STATE
          // -------------------------------------------

          isActive: true,

          isFeatured: true,

          // -------------------------------------------
          // CATEGORY
          // -------------------------------------------

          category: {
            select: {
              id: true,
              legacyId: true,
              name: true,
              slug: true,
              description: true,
              image: true,
              icon: true,
            },
          },

          // -------------------------------------------
          // LEGACY PRODUCT VARIANTS
          // -------------------------------------------

          variants: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          // -------------------------------------------
          // LEGACY PRODUCT IMAGES
          // -------------------------------------------

          productImages: {
            orderBy: [
              {
                sortOrder: 'asc',
              },
              {
                createdAt: 'asc',
              },
            ],
          },

          // -------------------------------------------
          // LEGACY PRODUCT INFO
          // -------------------------------------------

          productInfo: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          // -------------------------------------------
          // LEGACY PRODUCT HIGHLIGHTS
          // -------------------------------------------

          productHighlights: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          // -------------------------------------------
          // DATES
          // -------------------------------------------

          createdAt: true,

          updatedAt: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return product;
  }

  // =====================================================
  // CUSTOMER — SIMILAR PRODUCTS
  // =====================================================

  async findSimilar(
    productId: string,
    limit = 10,
  ) {
    const product =
      await this.prisma.product.findFirst({
        where: {
          id: productId,
          isActive: true,
        },

        select: {
          categoryId: true,
          id: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    const safeLimit =
      Math.min(
        Math.max(1, limit),
        20,
      );

    const products =
      await this.prisma.product.findMany({
        where: {
          isActive: true,

          categoryId:
            product.categoryId,

          id: {
            not: product.id,
          },
        },

        take: safeLimit,

        orderBy: [
          {
            isFeatured:
              'desc',
          },
          {
            createdAt:
              'desc',
          },
        ],

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

          images: true,

          isFeatured: true,
        },
      });

    return products;
  }

  // =====================================================
  // ADMIN — GET ALL PRODUCTS
  // =====================================================

  async findAllAdmin(
    page = 1,
    limit = 20,
  ) {
    const safePage =
      Math.max(1, page);

    const safeLimit =
      Math.min(
        Math.max(1, limit),
        100,
      );

    const skip =
      (safePage - 1) *
      safeLimit;

    const [
      products,
      total,
    ] = await Promise.all([
      this.prisma.product.findMany({
        skip,

        take: safeLimit,

        orderBy: {
          createdAt:
            'desc',
        },

        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          variants: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          productImages: {
            orderBy: [
              {
                sortOrder: 'asc',
              },
              {
                createdAt: 'asc',
              },
            ],
          },
        },
      }),

      this.prisma.product.count(),
    ]);

    return {
      products,

      pagination: {
        page: safePage,

        limit: safeLimit,

        total,

        totalPages:
          Math.ceil(
            total /
              safeLimit,
          ),
      },
    };
  }

  // =====================================================
  // ADMIN — GET PRODUCT
  // =====================================================

  async findByIdAdmin(
    id: string,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id,
        },

        include: {
          category: {
            select: {
              id: true,
              legacyId: true,
              name: true,
              slug: true,
              description: true,
              image: true,
              icon: true,
              isActive: true,
            },
          },

          variants: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          productImages: {
            orderBy: [
              {
                sortOrder: 'asc',
              },
              {
                createdAt: 'asc',
              },
            ],
          },

          productInfo: {
            orderBy: {
              createdAt: 'asc',
            },
          },

          productHighlights: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return product;
  }

  // =====================================================
  // ADMIN — UPDATE PRODUCT
  // =====================================================

  async update(
    id: string,
    dto: UpdateProductDto,
  ) {
    const existing =
      await this.prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    // ---------------------------------------------
    // Validate price
    // ---------------------------------------------

    const newPrice =
      dto.price ??
      Number(existing.price);

    const newMrp =
      dto.mrp ??
      Number(existing.mrp);

    if (newPrice > newMrp) {
      throw new ConflictException(
        'Selling price cannot be greater than MRP',
      );
    }

    // ---------------------------------------------
    // Slug validation
    // ---------------------------------------------

    if (dto.slug !== undefined) {
      const slug =
        dto.slug
          .trim()
          .toLowerCase();

      const duplicate =
        await this.prisma.product.findFirst({
          where: {
            slug,

            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Product slug already exists',
        );
      }
    }

    // ---------------------------------------------
    // SKU validation
    // ---------------------------------------------

    if (dto.sku !== undefined) {
      const sku =
        dto.sku.trim() || null;

      if (sku) {
        const duplicate =
          await this.prisma.product.findFirst({
            where: {
              sku,

              NOT: {
                id,
              },
            },
          });

        if (duplicate) {
          throw new ConflictException(
            'Product SKU already exists',
          );
        }
      }
    }

    // ---------------------------------------------
    // Category validation
    // ---------------------------------------------

    if (dto.categoryId !== undefined) {
      const category =
        await this.prisma.category.findUnique({
          where: {
            id: dto.categoryId,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'Category not found',
        );
      }

      if (!category.isActive) {
        throw new ConflictException(
          'Cannot move product to inactive category',
        );
      }
    }

    // ---------------------------------------------
    // Build update data
    // ---------------------------------------------

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      price?: number;
      mrp?: number;
      costPrice?: number | null;
      stock?: number;
      unit?: string | null;
      weight?: string | null;
      brand?: string | null;
      sku?: string | null;
      images?: string[];
      categoryId?: string;
      isActive?: boolean;
      isFeatured?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name =
        dto.name.trim();
    }

    if (dto.slug !== undefined) {
      data.slug =
        dto.slug
          .trim()
          .toLowerCase();
    }

    if (
      dto.description !==
      undefined
    ) {
      data.description =
        dto.description.trim() ||
        null;
    }

    if (dto.price !== undefined) {
      data.price =
        dto.price;
    }

    if (dto.mrp !== undefined) {
      data.mrp =
        dto.mrp;
    }

    if (
      dto.costPrice !==
      undefined
    ) {
      data.costPrice =
        dto.costPrice;
    }

    if (dto.stock !== undefined) {
      data.stock =
        dto.stock;
    }

    if (dto.unit !== undefined) {
      data.unit =
        dto.unit.trim() ||
        null;
    }

    if (dto.weight !== undefined) {
      data.weight =
        dto.weight.trim() ||
        null;
    }

    if (dto.brand !== undefined) {
      data.brand =
        dto.brand.trim() ||
        null;
    }

    if (dto.sku !== undefined) {
      data.sku =
        dto.sku.trim() ||
        null;
    }

    if (
      dto.images !==
      undefined
    ) {
      data.images =
        dto.images;
    }

    if (
      dto.categoryId !==
      undefined
    ) {
      data.categoryId =
        dto.categoryId;
    }

    if (
      dto.isActive !==
      undefined
    ) {
      data.isActive =
        dto.isActive;
    }

    if (
      dto.isFeatured !==
      undefined
    ) {
      data.isFeatured =
        dto.isFeatured;
    }

    // ---------------------------------------------
    // Update
    // ---------------------------------------------

    return this.prisma.product.update({
      where: {
        id,
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

        variants: {
          orderBy: {
            createdAt: 'asc',
          },
        },

        productImages: {
          orderBy: [
            {
              sortOrder: 'asc',
            },
            {
              createdAt: 'asc',
            },
          ],
        },

        productInfo: {
          orderBy: {
            createdAt: 'asc',
          },
        },

        productHighlights: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  // =====================================================
  // ADMIN — UPDATE STOCK
  // =====================================================

  async updateStock(
    id: string,
    dto: UpdateStockDto,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          stock: true,
          name: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    const updated =
      await this.prisma.product.update({
        where: {
          id,
        },

        data: {
          stock: dto.stock,
        },

        select: {
          id: true,
          name: true,
          stock: true,
          isActive: true,
        },
      });

    return updated;
  }

  // =====================================================
  // ADMIN — SOFT DELETE
  // =====================================================

  async remove(id: string) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    await this.prisma.product.update({
      where: {
        id,
      },

      data: {
        isActive: false,
      },
    });

    return {
      id,

      message:
        'Product deactivated successfully',
    };
  }
}