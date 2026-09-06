import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const store = await this.prisma.storeSettings.findFirst() || {};
    const help = await this.prisma.helpSettings.findFirst() || {};
    const delivery = await this.prisma.deliverySettings.findFirst() || {};

    return { store, help, delivery };
  }

  async updateSettings(dto: UpdateSettingsDto) {
    // 1. Store Settings Update
    const store = await this.prisma.storeSettings.findFirst();
    if (store) {
      await this.prisma.storeSettings.update({
        where: { id: store.id },
        data: { isClosed: dto.isClosed, closedMessage: dto.closedMessage }
      });
    } else {
      await this.prisma.storeSettings.create({
        data: { isClosed: dto.isClosed || false, closedMessage: dto.closedMessage }
      });
    }

    // 2. Help Settings Update
    const help = await this.prisma.helpSettings.findFirst();
    if (help) {
      await this.prisma.helpSettings.update({
        where: { id: help.id },
        data: { phone: dto.phone, whatsapp: dto.whatsapp, email: dto.email }
      });
    } else {
      await this.prisma.helpSettings.create({
        data: { phone: dto.phone, whatsapp: dto.whatsapp, email: dto.email }
      });
    }

    // 3. Delivery Settings Update
    const delivery = await this.prisma.deliverySettings.findFirst();
    if (delivery) {
      await this.prisma.deliverySettings.update({
        where: { id: delivery.id },
        data: { 
          deliveryCharge: dto.deliveryCharge, 
          freeDeliveryAbove: dto.freeDeliveryAbove, 
          minimumOrderAmount: dto.minimumOrderAmount 
        }
      });
    } else {
      await this.prisma.deliverySettings.create({
        data: { 
          deliveryCharge: dto.deliveryCharge || 0, 
          freeDeliveryAbove: dto.freeDeliveryAbove || 0, 
          minimumOrderAmount: dto.minimumOrderAmount || 0 
        }
      });
    }

    return this.getSettings();
  }
}
