import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationEvent, NotificationType } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

interface NotifyInput {
  userId: string;
  event: NotificationEvent;
  title?: string;
  body?: string;
  link?: string;
  email?: string; // if provided, an email is also sent
  types?: NotificationType[];
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    const types = input.types ?? ['IN_APP'];
    const copy = this.email.getNotificationCopy(input.event);
    const title = input.title ?? copy.IN_APP;
    const body = input.body ?? copy.IN_APP;

    const data: Prisma.NotificationUncheckedCreateInput = {
      userId: input.userId,
      event: input.event,
      type: types.includes('EMAIL') ? 'EMAIL' : 'IN_APP',
      title,
      body,
      link: input.link ?? null,
    };

    if (types.includes('EMAIL') || types.length === 0) {
      data.type = 'EMAIL';
    }

    await this.prisma.notification.create({ data });

    if (input.email && (types.includes('EMAIL') || types.length === 0)) {
      await this.email.sendEventEmail(input.email, input.event, copy.EMAIL, body);
    }
  }

  listForUser(userId: string, page = 1, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}