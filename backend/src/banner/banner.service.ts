import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto });
  }

  async findAll() {
    return this.prisma.banner.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');

    return this.prisma.banner.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');

    return this.prisma.banner.delete({ where: { id } });
  }
}
