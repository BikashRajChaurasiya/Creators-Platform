import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { sendMessageSchema, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly gateway: ChatGateway,
  ) {}

  private async participantOf(userId: string, conversationId: string) {
    return this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
  }

  async createConversation(
    user: JwtUser,
    input: { campaignId?: string | null; participantIds: string[] },
  ) {
    const participants = [...new Set([user.userId, ...input.participantIds])];
    if (participants.length < 2) throw new ForbiddenException('A conversation needs at least 2 participants');

    // find an existing 1:1 conversation to avoid duplicates
    const existing = await this.prisma.conversation.findFirst({
      where: {
        campaignId: input.campaignId ?? null,
        participants: { every: { userId: { in: participants } } },
      },
      include: { participants: true },
    });
    if (existing && existing.participants.length === participants.length) {
      return this.findDetailed(existing.id, user);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        campaignId: input.campaignId ?? null,
        participants: {
          create: participants.map((id) => ({ userId: id })),
        },
      },
    });
    return this.findDetailed(conversation.id, user);
  }

  async listMine(user: JwtUser, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const participantRows = await this.prisma.conversationParticipant.findMany({
      where: { userId: user.userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
      skip,
      take: limit,
    });
    const total = await this.prisma.conversationParticipant.count({ where: { userId: user.userId } });
    const data = participantRows.map((p) => ({
      id: p.conversation.id,
      campaignId: p.conversation.campaignId,
      unreadCount: p.unreadCount,
      lastMessage: p.conversation.messages[0] ?? null,
      otherParticipants: p.conversation.participants
        .filter((x) => x.userId !== user.userId)
        .map((x) => x.user),
      updatedAt: p.conversation.updatedAt,
    }));
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  async findDetailed(conversationId: string, user: JwtUser) {
    const membership = await this.participantOf(user.userId, conversationId);
    if (!membership) throw new ForbiddenException('Not a participant of this conversation');
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
        campaign: { select: { id: true, title: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async messages(conversationId: string, user: JwtUser, page = 1, limit = 50) {
    const membership = await this.participantOf(user.userId, conversationId);
    if (!membership) throw new ForbiddenException('Not a participant of this conversation');
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return {
      data: items.reverse(),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  async send(user: JwtUser, conversationId: string, input: z.infer<typeof sendMessageSchema>) {
    const membership = await this.participantOf(user.userId, conversationId);
    if (!membership) throw new ForbiddenException('Not a participant of this conversation');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: user.userId,
        content: input.content,
        fileUrl: input.fileUrl || null,
        type: input.fileUrl ? 'FILE' : 'TEXT',
      },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // bump conversation + unread counts for others
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: user.userId } },
    });
    await this.prisma.$transaction([
      this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
      ...participants.map((p) =>
        this.prisma.conversationParticipant.update({
          where: { id: p.id },
          data: { unreadCount: { increment: 1 } },
        }),
      ),
    ]);

    for (const p of participants) {
      const recipient = await this.prisma.user.findUnique({ where: { id: p.userId } });
      if (recipient) {
        await this.notifications.notify({
          userId: recipient.id,
          event: 'NEW_MESSAGE',
          title: `New message from ${user.name}`,
          body: input.content.slice(0, 120),
          link: `/messages/${conversationId}`,
          email: recipient.email,
        });
      }
    }

    this.gateway.emitToConversation(conversationId, 'message:new', {
      conversationId,
      message,
    });
    return message;
  }

  async markRead(user: JwtUser, conversationId: string) {
    const membership = await this.participantOf(user.userId, conversationId);
    if (!membership) throw new ForbiddenException('Not a participant of this conversation');
    await this.prisma.conversationParticipant.update({
      where: { id: membership.id },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });
    this.gateway.emitToConversation(conversationId, 'conversation:read', { conversationId, userId: user.userId });
    return { ok: true };
  }
}