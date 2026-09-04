import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '../generated/prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AdminService } from './admin.service';

import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';

@Controller('admin')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  // =====================================================
  // DASHBOARD
  // =====================================================

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // =====================================================
  // CREATE PRODUCT
  // =====================================================

  @Post('products')
  async createProduct(
    @Body()
    dto: CreateAdminProductDto,
  ) {
    return this.adminService.createProduct(
      dto,
    );
  }

  // =====================================================
  // GET PRODUCTS
  // =====================================================

  @Get('products')
  async getProducts(
    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,

    @Query('search')
    search?: string,
  ) {
    return this.adminService.getProducts(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
    );
  }

  // =====================================================
  // GET SINGLE PRODUCT
  // =====================================================

  @Get('products/:id')
  async getProduct(
    @Param('id')
    productId: string,
  ) {
    return this.adminService.getProductById(
      productId,
    );
  }

  // =====================================================
  // GET USERS / CUSTOMERS
  // =====================================================

  @Get('users')
  async getAllCustomers() {
    return this.adminService.getAllCustomers();
  }

  // =====================================================
  // UPDATE PRODUCT
  // =====================================================

  @Patch('products/:id')
  async updateProduct(
    @Param('id')
    productId: string,

    @Body()
    dto: UpdateAdminProductDto,
  ) {
    return this.adminService.updateProduct(
      productId,
      dto,
    );
  }

  // =====================================================
  // DELETE / DEACTIVATE PRODUCT
  // =====================================================

  @Delete('products/:id')
  async deleteProduct(
    @Param('id')
    productId: string,
  ) {
    return this.adminService.deleteProduct(
      productId,
    );
  }

  // =====================================================
  // RESTORE PRODUCT
  // =====================================================

  @Patch('products/:id/restore')
  async restoreProduct(
    @Param('id')
    productId: string,
  ) {
    return this.adminService.restoreProduct(
      productId,
    );
  }

  // =====================================================
  // UPDATE STOCK
  // =====================================================

  @Patch('products/:id/stock')
  async updateStock(
    @Param('id')
    productId: string,

    @Body()
    dto: UpdateProductStockDto,
  ) {
    return this.adminService.updateProductStock(
      productId,
      dto.stock,
    );
  }
}