import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paymentCreateSchema, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private async commissionPercent(settingKey = 'commissionPercent') {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: settingKey } });
    if (setting && typeof setting.value === 'number') return setting.value;
    const env = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 15);
    return Number.isFinite(env) ? env : 15;
  }

  async create(user: JwtUser, input: z.infer<typeof paymentCreateSchema>) {
    if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
      throw new ForbiddenException('Only finance/admin can create payments');
    }
    const [application, creator, campaign, commissionPercent] = await Promise.all([
      this.prisma.application.findUnique({
        where: { campaignId_creatorId: { campaignId: input.campaignId, creatorId: input.creatorId } },
      }),
      this.prisma.user.findUnique({ where: { id: input.creatorId } }),
      this.prisma.campaign.findUnique({ where: { id: input.campaignId }, include: { brand: true } }),
      this.commissionPercent(),
    ]);
    if (!application) throw new NotFoundException('Accepted application not found for this creator/campaign');
    if (!creator) throw new NotFoundException('Creator not found');
    if (!campaign) throw new NotFoundException('Campaign not found');

    const commissionAmount = Math.round((input.amount * commissionPercent) / 100);
    const payoutAmount = input.amount - commissionAmount;

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          campaignId: input.campaignId,
          applicationId: application.id,
          creatorId: input.creatorId,
          amount: input.amount,
          commissionPercent,
          commissionAmount,
          payoutAmount,
          type: input.type,
          description: input.description || null,
        },
      });
      await tx.invoice.create({
        data: {
          brandId: campaign.brandId,
          campaignId: campaign.id,
          amount: input.amount,
          commissionPercent,
          commissionAmount,
          status: 'DRAFT',
        },
      });
      return p;
    });

    await this.notifications.notify({
      userId: creator.id,
      event: 'PAYMENT_COMPLETED',
      title: 'Payment initiated',
      body: `A payout of NPR ${input.amount} was created for your campaign work`,
      link: '/payments',
      email: creator.email,
      types: ['IN_APP', 'EMAIL'],
    });
    return payment;
  }

  async updateStatus(user: JwtUser, paymentId: string, status: string) {
    if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
      throw new ForbiddenException('Only finance/admin can update payments');
    }
    const allowed = ['PENDING', 'APPROVED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'];
    if (!allowed.includes(status)) throw new NotFoundException('Invalid status');

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { creator: true } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: status as never, paidAt: status === 'PAID' ? new Date() : null },
    });

    if (status === 'PAID') {
      await this.notifications.notify({
        userId: payment.creator.id,
        event: 'PAYMENT_COMPLETED',
        title: 'Payment completed!',
        body: `Your payout of NPR ${payment.amount} was released`,
        link: '/creator/payments',
        email: payment.creator.email,
        types: ['IN_APP', 'EMAIL'],
      });
    }
    return updated;
  }

  async list(user: JwtUser, scope: 'outgoing' | 'received' | 'all', page = 1, limit = 20) {
    const where: Prisma.PaymentWhereInput = {};
    if (scope === 'outgoing') {
      if (user.role === 'CREATOR') where.creatorId = user.userId;
      else if (user.role === 'BRAND') {
        const brand = await this.prisma.brand.findUnique({ where: { userId: user.userId } });
        if (!brand) return { data: [], meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } };
        const campaignIds = await this.prisma.campaign.findMany({ where: { brandId: brand.id }, select: { id: true } });
        where.campaignId = { in: campaignIds.map((c) => c.id) };
      } else if (!['ADMIN', 'FINANCE'].includes(user.role)) {
        throw new ForbiddenException('Access denied');
      }
    } else if (scope === 'received') {
      if (user.role !== 'CREATOR') throw new ForbiddenException('Only creators have received payments');
      where.creatorId = user.userId;
    } else if (scope === 'all' && !['ADMIN', 'FINANCE', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          campaign: { select: { id: true, title: true } },
          application: { select: { id: true, pitch: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  async summary(user: JwtUser) {
    if (user.role === 'CREATOR') {
      const [totalEarned, paidCount, pendingCount, totalOutstanding] = await Promise.all([
        this.prisma.payment.aggregate({ where: { creatorId: user.userId, status: 'PAID' }, _sum: { payoutAmount: true } }),
        this.prisma.payment.count({ where: { creatorId: user.userId, status: 'PAID' } }),
        this.prisma.payment.count({ where: { creatorId: user.userId, status: { in: ['PENDING', 'APPROVED'] } } }),
        this.prisma.payment.aggregate({ where: { creatorId: user.userId, status: { in: ['PENDING', 'APPROVED'] } }, _sum: { payoutAmount: true } }),
      ]);
      return {
        totalEarned: totalEarned._sum.payoutAmount ?? 0,
        paidCount,
        pendingCount,
        totalOutstanding: totalOutstanding._sum.payoutAmount ?? 0,
      };
    }
    if (user.role === 'BRAND') {
      const brand = await this.prisma.brand.findUnique({ where: { userId: user.userId } });
      const campaignIds = brand
        ? await this.prisma.campaign.findMany({ where: { brandId: brand.id }, select: { id: true } }).then((c) => c.map((x) => x.id))
        : [];
      const [totalBilled, invoiceCount, unpaid] = await Promise.all([
        this.prisma.invoice.aggregate({ where: { campaignId: { in: campaignIds }, status: 'PAID' }, _sum: { amount: true } }),
        this.prisma.invoice.count({ where: { campaignId: { in: campaignIds } } }),
        this.prisma.invoice.aggregate({ where: { campaignId: { in: campaignIds }, status: { in: ['SENT', 'DRAFT', 'OVERDUE'] } }, _sum: { amount: true } }),
      ]);
      return {
        totalBilled: totalBilled._sum.amount ?? 0,
        invoiceCount,
        unpaidTotal: unpaid._sum.amount ?? 0,
      };
    }
    // admin/finance
    const [gross, net, pending, commission] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { payoutAmount: true, commissionAmount: true } }),
      this.prisma.payment.aggregate({ where: { status: { in: ['PENDING', 'APPROVED'] } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ _sum: { commissionAmount: true } }),
    ]);
    return {
      grossVolume: gross._sum.amount ?? 0,
      netPayouts: net._sum.payoutAmount ?? 0,
      commission: commission._sum.commissionAmount ?? 0,
      pending: pending._sum.amount ?? 0,
      payouts: await this.prisma.payment.count(),
    };
  }
}