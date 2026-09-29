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

  /**
   * Returns the page plus the `meta` every other list endpoint sends. The
   * previous shape was a bare array, so the audit log silently truncated at
   * `limit` with no indication that older entries existed.
   */
  async list(page = 1, limit = 50, filter?: { action?: string; targetType?: string }) {
    const where = {
      action: filter?.action || undefined,
      targetType: filter?.targetType || undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  count(filter?: { action?: string; targetType?: string }) {
    return this.prisma.auditLog.count({
      where: { action: filter?.action || undefined, targetType: filter?.targetType || undefined },
    });
  }
}