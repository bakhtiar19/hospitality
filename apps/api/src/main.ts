import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor.js';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor.js';
import { getCorsOriginConfig, getJwtAccessSecret, getJwtRefreshSecret } from './common/config/security.config.js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

// Safe JSON serialization for Prisma BigInt fields
if (!(BigInt.prototype as unknown as { toJSON?: () => number }).toJSON) {
  (BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
    return Number(this);
  };
}

async function bootstrap() {
  // Validate security configuration upfront (fail-fast in production if secrets are weak/missing)
  getJwtAccessSecret();
  getJwtRefreshSecret();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Limit JSON body size (2MB max to allow compressed hotel logos without DoS risk)
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '2mb' });
  app.disable('x-powered-by');

  app.enableCors({
    origin: getCorsOriginConfig(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-property-id', 'x-idempotency-key', 'x-correlation-id'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new IdempotencyInterceptor(),
    new AuditLogInterceptor()
  );

  // Only expose Swagger docs in non-production unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Hospitality PMS & Channel Manager API')
      .setDescription(
        'Multi-Tenant Hotel Property Management System API (VPS Lightweight SaaS Architecture)'
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[Hospitality API] Server running on http://localhost:${port}/api/v1`);
}

bootstrap();
