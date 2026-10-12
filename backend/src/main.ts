import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      rawBody: true,
    },
  );

  // =====================================================
  // GLOBAL API PREFIX (Sabse pehle yeh set hona chahiye)
  // =====================================================
  app.setGlobalPrefix('api/v1');

  // =====================================================
  // SERVE STATIC FILES (IMAGES)
  // process.cwd() exact root directory uthayega
  // =====================================================
  app.use('/api/v1/uploads', express.static(join(process.cwd(), 'uploads')));

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
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter()
  );

  // =====================================================
  // CORS
  // =====================================================
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Razorpay-Signature',
      'X-Razorpay-Event-Id',
      'ngrok-skip-browser-warning',
    ],
  });

  // =====================================================
  // GRACEFUL SHUTDOWN
  // =====================================================
  app.enableShutdownHooks();

  // =====================================================
  // PORT
  // =====================================================
  const port = Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');

  console.log(`Shop2Door API running on http://localhost:${port}/api/v1`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Shop2Door API:', error);
  process.exit(1);
});
