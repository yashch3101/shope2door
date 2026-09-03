import {
  ValidationPipe,
} from '@nestjs/common';

import { NestFactory } from '@nestjs/core';

import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import helmet from 'helmet';

import { AppModule } from './app.module';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      // IMPORTANT:
      // Razorpay webhook signature verification
      // requires access to the raw request body.
      rawBody: true,
    },
  );

  // =====================================================
  // SERVE STATIC FILES (IMAGES)
  // =====================================================
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // =====================================================
  // GLOBAL API PREFIX
  // =====================================================

  app.setGlobalPrefix('api/v1');

  // =====================================================
  // SERVE STATIC FILES (IMAGES)
  // =====================================================
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // =====================================================
  // SECURITY HEADERS
  // =====================================================

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  // =====================================================
  // GLOBAL VALIDATION
  // =====================================================

  app.useGlobalPipes(
    new ValidationPipe({
      // Remove properties which are not present
      // in the DTO.
      whitelist: true,

      // Throw error when unknown properties are sent.
      forbidNonWhitelisted: true,

      // Automatically transform DTO values
      // according to their expected types.
      transform: true,

      // Don't expose unnecessary validation details.
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
  );

  // =====================================================
  // CORS
  // =====================================================

  const corsOrigins =
    process.env.CORS_ORIGINS
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  const isProduction =
    process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin, callback) => {
      // Server-to-server / Postman requests
      if (!origin) {
        return callback(null, true);
      }

      // Development / test mode
      if (
        !isProduction &&
        corsOrigins.length === 0
      ) {
        return callback(null, true);
      }

      // Production or explicitly configured origins
      if (
        corsOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          'Origin not allowed by CORS',
        ),
        false,
      );
    },

    credentials: true,

    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Razorpay-Signature',
      'X-Razorpay-Event-Id',
    ],
  });

  // =====================================================
  // GRACEFUL SHUTDOWN
  // =====================================================

  app.enableShutdownHooks();

  // =====================================================
  // PORT
  // =====================================================

  const port = Number(
    process.env.PORT || 3000,
  );

  await app.listen(port, '0.0.0.0');

  console.log(
    `Shop2Door API running on http://localhost:${port}/api/v1`,
  );
}

bootstrap().catch((error) => {
  console.error(
    'Failed to start Shop2Door API:',
    error,
  );

  process.exit(1);
});