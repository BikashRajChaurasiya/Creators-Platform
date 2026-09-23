import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { NotificationController } from './notification.controller';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, EmailService],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}