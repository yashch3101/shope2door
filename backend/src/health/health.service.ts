import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async check() {
    const start = performance.now();

    let database: 'up' | 'down' = 'up';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    const responseTimeMs = Number(
      (
        performance.now() - start
      ).toFixed(2),
    );

    const uptimeSeconds = Math.floor(
      (Date.now() - this.startedAt) / 1000,
    );

    return {
      success: database === 'up',

      service: 'shope2door-api',

      status:
        database === 'up'
          ? 'ok'
          : 'degraded',

      database,

      uptimeSeconds,

      responseTimeMs,

      timestamp:
        new Date().toISOString(),
    };
  }
}