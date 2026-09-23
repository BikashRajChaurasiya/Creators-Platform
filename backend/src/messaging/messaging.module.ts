import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { ChatGateway } from './chat.gateway';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [NotificationModule, AuthModule],
  controllers: [MessagingController],
  providers: [MessagingService, ChatGateway],
  exports: [MessagingService, ChatGateway],
})
export class MessagingModule {}