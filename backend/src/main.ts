import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { ZodFilter } from './common/filters/zod.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * On Vercel the deployment host is dynamic (production + every preview), so
 * the deployment-provided hostnames are always trusted. APP_URL may still list
 * extra origins (comma separated) and can be set to `*` to allow any origin.
 */
function resolveOrigins(config: ConfigService): true | string[] {
  const configured = config.get<string>('APP_URL', 'http://localhost:3000');
  if (configured.trim() === '*') return true;

  const origins = new Set(
    configured
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );

  for (const host of [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]) {
    if (host) origins.add(`https://${host}`);
  }
  return [...origins];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: resolveOrigins(config), credentials: true });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.useGlobalFilters(new ZodFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  logger.log(`UGCNP API listening on port ${port} at /api/v1`);
}

void bootstrap();
