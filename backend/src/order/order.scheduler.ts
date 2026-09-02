import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { Cron } from '@nestjs/schedule';

import { OrderService } from './order.service';

@Injectable()
export class OrderScheduler {
  private readonly logger =
    new Logger(OrderScheduler.name);

  constructor(
    private readonly orderService: OrderService,
  ) {}

  // =====================================================
  // EXPIRE OLD UNPAID ONLINE ORDERS
  // Runs every 5 minutes
  // =====================================================

  @Cron('*/5 * * * *')
  async expirePendingOnlineOrders() {
    try {
      const result =
        await this.orderService
          .expirePendingOnlineOrders();

      if (
        result.expiredCount > 0
      ) {
        this.logger.log(
          `Expired ${result.expiredCount} unpaid online order(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to expire pending online orders',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }
}