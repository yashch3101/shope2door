import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  // Get Store Location & All Slabs
  async getLocationData() {
    const settings = await this.prisma.deliverySettings.findFirst();
    const slabs = await this.prisma.deliverySlab.findMany({ orderBy: { minDistance: 'asc' } });
    return { success: true, storeLocation: settings, slabs };
  }

  // Update Store Coordinates
  async updateStoreLocation(lat: number, lon: number) {
    let settings = await this.prisma.deliverySettings.findFirst();
    if (settings) {
      settings = await this.prisma.deliverySettings.update({
        where: { id: settings.id },
        data: { storeLatitude: lat, storeLongitude: lon }
      });
    } else {
      settings = await this.prisma.deliverySettings.create({
        data: { storeLatitude: lat, storeLongitude: lon }
      });
    }
    return { success: true, message: 'Store location updated', data: settings };
  }

  // Add New Distance Slab
  async addSlab(min: number, max: number, charge: number) {
    const slab = await this.prisma.deliverySlab.create({
      data: { minDistance: min, maxDistance: max, charge }
    });
    return { success: true, message: 'Slab added successfully', data: slab };
  }

  // Delete Slab
  async deleteSlab(id: string) {
    await this.prisma.deliverySlab.delete({ where: { id } });
    return { success: true, message: 'Slab deleted successfully' };
  }
}