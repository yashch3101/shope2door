import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    PrismaService.name,
  );

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured. Check backend/.env',
      );
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    super({
      adapter,
    });
  }

  // =====================================================
  // DATABASE CONNECTION
  // =====================================================

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();

      this.logger.log(
        'PostgreSQL database connected successfully',
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect to PostgreSQL database',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw error;
    }
  }

  // =====================================================
  // DATABASE DISCONNECTION
  // =====================================================

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();

      this.logger.log(
        'PostgreSQL database disconnected successfully',
      );
    } catch (error) {
      this.logger.error(
        'Failed to disconnect from PostgreSQL database',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw error;
    }
  }
}