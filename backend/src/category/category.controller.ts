import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { CategoryService } from './category.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../generated/prisma/client';

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) {}

  // =====================================================
  // ADMIN
  // POST /api/v1/categories/upload (IMAGE UPLOAD)
  // =====================================================

  @Post('upload')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `category-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadCategoryIcon(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is missing');
    }
    return {
      success: true,
      message: 'Image uploaded successfully',
      path: file.filename,
    };
  }

  // =====================================================
  // CUSTOMER
  // GET /api/v1/categories
  // =====================================================

  @Get()
  async findAll() {
    const data =
      await this.categoryService.findAll();

    return {
      success: true,
      message: 'Categories fetched successfully',
      data,
    };
  }

  // =====================================================
  // CUSTOMER
  // GET /api/v1/categories/slug/:slug
  // =====================================================

  @Get('slug/:slug')
  async findBySlug(
    @Param('slug') slug: string,
  ) {
    const data =
      await this.categoryService.findBySlug(slug);

    return {
      success: true,
      message: 'Category fetched successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // GET /api/v1/categories/admin/all
  // =====================================================

  @Get('admin/all')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async findAllAdmin() {
    const data =
      await this.categoryService.findAllAdmin();

    return {
      success: true,
      message:
        'Admin categories fetched successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // GET /api/v1/categories/:id
  // =====================================================

  @Get(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async findById(
    @Param('id') id: string,
  ) {
    const data =
      await this.categoryService.findById(id);

    return {
      success: true,
      message: 'Category fetched successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // POST /api/v1/categories
  // =====================================================

  @Post()
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateCategoryDto,
  ) {
    const data =
      await this.categoryService.create(dto);

    return {
      success: true,
      message: 'Category created successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // PATCH /api/v1/categories/:id
  // =====================================================

  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data =
      await this.categoryService.update(
        id,
        dto,
      );

    return {
      success: true,
      message: 'Category updated successfully',
      data,
    };
  }

  // =====================================================
  // ADMIN
  // DELETE /api/v1/categories/:id
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
      await this.categoryService.remove(id);

    return {
      success: true,
      ...data,
    };
  }
}