import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { pageQuerySchema } from '@ugcnp/shared';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @Roles('CREATOR', 'BRAND', 'ADMIN', 'MANAGER', 'QA', 'FINANCE')
  async list(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(pageQuerySchema)) query: { page: number; limit: number },
  ) {
    return { data: await this.notifications.listForUser(userId, query.page, query.limit) };
  }

  @Get('unread-count')
  async unread(@CurrentUser('id') userId: string) {
    return { count: await this.notifications.unreadCount(userId) };
  }

  @Patch(':id/read')
  async read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Post('read-all')
  async readAll(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Get('health')
  @Permissions('reports.read')
  health() {
    return { status: 'ok' };
  }
}