import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { ZodFilter } from './common/filters/zod.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config.get<string>('APP_URL', 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.use(helmet());
  app.use(compression());
  app.useGlobalFilters(new ZodFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`UGCNP API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();