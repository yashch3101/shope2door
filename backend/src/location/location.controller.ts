import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/client';

@Controller('admin/location') 
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  // YAHAN SE @Roles HATA DIYA TAQI CUSTOMER APP BHI BINA BLOCK HUE FETCH KAR SAKE
  async getLocationData() {
    return this.locationService.getLocationData();
  }

  @Post('store')
  @Roles(UserRole.ADMIN) // SIRF ADMIN SAVE KAR SAKTA HAI
  async updateStoreLocation(@Body() body: { lat: number; lon: number }) {
    return this.locationService.updateStoreLocation(body.lat, body.lon);
  }

  @Post('slab')
  @Roles(UserRole.ADMIN) // SIRF ADMIN ADD KAR SAKTA HAI
  async addSlab(@Body() body: { minDistance: number; maxDistance: number; charge: number }) {
    return this.locationService.addSlab(body.minDistance, body.maxDistance, body.charge);
  }

  @Delete('slab/:id')
  @Roles(UserRole.ADMIN) // SIRF ADMIN DELETE KAR SAKTA HAI
  async deleteSlab(@Param('id') id: string) {
    return this.locationService.deleteSlab(id);
  }
}