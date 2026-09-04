import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BannerService } from './banner.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/client';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  // Customer ke liye (App par dikhane ke liye)
  @Get()
  async findAll() {
    const data = await this.bannerService.findAll();
    return { success: true, message: 'Banners fetched successfully', data };
  }

  // Admin routes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateBannerDto) {
    const data = await this.bannerService.create(dto);
    return { success: true, message: 'Banner created successfully', data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    const data = await this.bannerService.update(id, dto);
    return { success: true, message: 'Banner updated successfully', data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.bannerService.remove(id);
    return { success: true, message: 'Banner deleted successfully', data };
  }
}
