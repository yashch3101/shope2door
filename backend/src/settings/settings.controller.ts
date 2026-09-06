import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Public: App open hote hi settings mil jayengi
  @Get()
  async getSettings() {
    const data = await this.settingsService.getSettings();
    return { success: true, message: 'Settings fetched successfully', data };
  }

  // Admin Only: Admin panel se update karne ke liye
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const data = await this.settingsService.updateSettings(dto);
    return { success: true, message: 'Settings updated successfully', data };
  }
}
