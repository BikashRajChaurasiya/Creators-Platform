import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { ChatGateway } from './chat.gateway';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

/**
 * The chat gateway no-ops unless WEBSOCKETS_ENABLED=true. Serverless runtimes
 * terminate a request before any protocol upgrade, so it stays off there and
 * messaging falls back to the REST endpoints, which remain the source of truth.
 */
@Module({
  imports: [NotificationModule, AuthModule],
  controllers: [MessagingController],
  providers: [MessagingService, ChatGateway],
  exports: [MessagingService, ChatGateway],
})
export class MessagingModule {}
