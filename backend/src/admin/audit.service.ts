import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    input: {
      actor?: JwtUser | null;
      action: string;
      targetType?: string;
      targetId?: string;
      metadata?: Record<string, unknown>;
    },
    ip?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actor?.userId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ip: ip ?? null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  list(page = 1, limit = 50, filter?: { action?: string; targetType?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        action: filter?.action || undefined,
        targetType: filter?.targetType || undefined,
      },
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  count(filter?: { action?: string; targetType?: string }) {
    return this.prisma.auditLog.count({
      where: { action: filter?.action || undefined, targetType: filter?.targetType || undefined },
    });
  }
}