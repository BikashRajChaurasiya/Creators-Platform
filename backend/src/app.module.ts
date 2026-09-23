import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CreatorModule } from './creator/creator.module';
import { BrandModule } from './brand/brand.module';
import { CampaignModule } from './campaign/campaign.module';
import { ApplicationModule } from './application/application.module';
import { UploadModule } from './upload/upload.module';
import { PaymentModule } from './payment/payment.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60),
            limit: config.get<number>('THROTTLE_LIMIT', 120),
          },
        ],
      }),
    }),
    PrismaModule,
    RedisModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CreatorModule,
    BrandModule,
    CampaignModule,
    ApplicationModule,
    UploadModule,
    PaymentModule,
    MessagingModule,
    NotificationModule,
    AnalyticsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}