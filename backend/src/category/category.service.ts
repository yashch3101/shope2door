import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================
  // CREATE CATEGORY
  // =====================================================

  async create(
    dto: CreateCategoryDto,
  ) {
    const name = dto.name.trim();

    const slug = dto.slug
      .trim()
      .toLowerCase();

    const existingCategory =
      await this.prisma.category.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      });

    if (existingCategory) {
      throw new ConflictException(
        'Category slug already exists',
      );
    }

    const category =
      await this.prisma.category.create({
        data: {
          name,
          slug,

          description:
            dto.description?.trim() || null,

          image:
            dto.image?.trim() || null,

          icon:
            dto.icon?.trim() || null,

          sortOrder:
            dto.sortOrder ?? 0,

          isActive: true,
        },

        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          image: true,
          icon: true,
          sortOrder: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return category;
  }

  // =====================================================
  // GET ALL ACTIVE CATEGORIES
  // CUSTOMER
  // =====================================================

  async findAll() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
      },

      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],

      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        icon: true,
        sortOrder: true,
      },
    });
  }

  // =====================================================
  // GET ALL CATEGORIES
  // ADMIN
  // =====================================================

  async findAllAdmin() {
    return this.prisma.category.findMany({
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],

      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        icon: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  // =====================================================
  // GET CATEGORY BY ID
  // ADMIN
  // =====================================================

  async findById(id: string) {
    const category =
      await this.prisma.category.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          image: true,
          icon: true,
          sortOrder: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              products: true,
            },
          },
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    return category;
  }

  // =====================================================
  // GET CATEGORY BY SLUG
  // CUSTOMER
  // =====================================================

  async findBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();

    const category = await this.prisma.category.findFirst({
      where: {
        slug: normalizedSlug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        icon: true,
        sortOrder: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  // =====================================================
  // UPDATE CATEGORY
  // ADMIN
  // =====================================================

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const existingCategory =
      await this.prisma.category.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!existingCategory) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      image?: string | null;
      icon?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    // ---------------------------------------------------
    // NAME
    // ---------------------------------------------------

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    // ---------------------------------------------------
    // SLUG
    // ---------------------------------------------------

    if (dto.slug !== undefined) {
      const slug = dto.slug
        .trim()
        .toLowerCase();

      const duplicate =
        await this.prisma.category.findFirst({
          where: {
            slug,
            NOT: {
              id,
            },
          },

          select: {
            id: true,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Category slug already exists',
        );
      }

      data.slug = slug;
    }

    // ---------------------------------------------------
    // DESCRIPTION
    // ---------------------------------------------------

    if (dto.description !== undefined) {
      data.description =
        dto.description.trim() || null;
    }

    // ---------------------------------------------------
    // IMAGE
    // ---------------------------------------------------

    if (dto.image !== undefined) {
      data.image =
        dto.image.trim() || null;
    }

    // ---------------------------------------------------
    // ICON
    // ---------------------------------------------------

    if (dto.icon !== undefined) {
      data.icon =
        dto.icon.trim() || null;
    }

    // ---------------------------------------------------
    // SORT ORDER
    // ---------------------------------------------------

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    // ---------------------------------------------------
    // ACTIVE STATUS
    // ---------------------------------------------------

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const category =
      await this.prisma.category.update({
        where: {
          id,
        },

        data,

        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          image: true,
          icon: true,
          sortOrder: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return category;
  }

  // =====================================================
  // SOFT DELETE / DEACTIVATE
  // ADMIN
  // =====================================================

  async remove(
    id: string,
  ) {
    const category =
      await this.prisma.category.findUnique({
        where: {
          id,
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
      return {
        id: category.id,
        message:
          'Category is already inactive',
      };
    }

    const updatedCategory =
      await this.prisma.category.update({
        where: {
          id,
        },

        data: {
          isActive: false,
        },

        select: {
          id: true,
        },
      });

    return {
      id: updatedCategory.id,
      message:
        'Category deactivated successfully',
    };
  }

  // =====================================================
  // INTERNAL HELPER
  // =====================================================

  private async isCategoryActive(
    id: string,
  ): Promise<boolean> {
    const category =
      await this.prisma.category.findUnique({
        where: {
          id,
        },

        select: {
          isActive: true,
        },
      });

    return category?.isActive === true;
  }
}