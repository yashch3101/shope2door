import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ProductService } from './product.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../generated/prisma/client';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
  ) {}

  // =====================================================
  // CUSTOMER
  // GET /api/v1/products
  // =====================================================

  @Get()
  async findAll(
    @Query(
      'page',
      new DefaultValuePipe(1),
      ParseIntPipe,
    )
    page: number,

    @Query(
      'limit',
      new DefaultValuePipe(20),
      ParseIntPipe,
    )
    limit: number,

    @Query('search')
    search?: string,

    @Query('categoryId')
    categoryId?: string,
  ) {
    const data =
      await this.productService.findAll(
        page,
        limit,
        search,
        categoryId,
      );

    return {
      success: true,
      message:
        'Products fetched successfully',
      data,
    };
  }

  // =====================================================
  // CUSTOMER
  // GET /api/v1/products/similar/:id
  // =====================================================

  @Get('similar/:id')
  async findSimilar(
    @Param('id') id: string,

    @Query(
      'limit',
      new DefaultValuePipe(10),
      ParseIntPipe,
    )
    limit: number,
  ) {
    const data =
      await this.productService.findSimilar(
        id,
        limit,
      );

    return {
      success: true,
      message:
        'Similar products fetched successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // GET /api/v1/products/admin/all
  // =====================================================

  @Get('admin/all')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async findAllAdmin(
    @Query(
      'page',
      new DefaultValuePipe(1),
      ParseIntPipe,
    )
    page: number,

    @Query(
      'limit',
      new DefaultValuePipe(20),
      ParseIntPipe,
    )
    limit: number,
  ) {
    const data =
      await this.productService.findAllAdmin(
        page,
        limit,
      );

    return {
      success: true,
      message:
        'Admin products fetched successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // GET /api/v1/products/admin/:id
  // =====================================================

  @Get('admin/:id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async findByIdAdmin(
    @Param('id') id: string,
  ) {
    const data =
      await this.productService.findByIdAdmin(
        id,
      );

    return {
      success: true,
      message:
        'Product fetched successfully',
      data,
    };
  }

  // =====================================================
  // CUSTOMER
  // GET /api/v1/products/:id
  // =====================================================

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ) {
    const data =
      await this.productService.findById(
        id,
      );

    return {
      success: true,
      message:
        'Product fetched successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // POST /api/v1/products
  // =====================================================

  @Post()
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateProductDto,
  ) {
    const data =
      await this.productService.create(
        dto,
      );

    return {
      success: true,
      message:
        'Product created successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // PATCH /api/v1/products/:id
  // =====================================================

  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,

    @Body() dto: UpdateProductDto,
  ) {
    const data =
      await this.productService.update(
        id,
        dto,
      );

    return {
      success: true,
      message:
        'Product updated successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // PATCH /api/v1/products/:id/stock
  // =====================================================

  @Patch(':id/stock')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async updateStock(
    @Param('id') id: string,

    @Body() dto: UpdateStockDto,
  ) {
    const data =
      await this.productService.updateStock(
        id,
        dto,
      );

    return {
      success: true,
      message:
        'Product stock updated successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // DELETE /api/v1/products/:id
  // =====================================================

  @Delete(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
  ) {
    const data =
      await this.productService.remove(
        id,
      );

    return {
      success: true,
      ...data,
    };
  }
}