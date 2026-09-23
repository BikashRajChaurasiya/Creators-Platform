import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
    NotificationModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}