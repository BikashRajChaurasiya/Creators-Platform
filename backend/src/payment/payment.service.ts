import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { paymentCreateSchema, PAYOUT_CHANNELS, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

/**
 * Payment lifecycle (maker–checker enforced):
 *
 *   PENDING  --(2nd person approves, different from preparer)-->  APPROVED
 *   APPROVED --(release by someone who is neither preparer nor approver)--> PAID
 *   PENDING|APPROVED --(operator)--> FAILED | REFUNDED | CANCELLED
 *
 * A single operator can never both prepare and approve/release a payment.
 */

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private isOps(role: string) {
    return role === 'ADMIN' || role === 'FINANCE';
  }

  private async commissionPercent(settingKey = 'commissionPercent') {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: settingKey } });
    if (setting && typeof setting.value === 'number') return setting.value;
    const env = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 15);
    return Number.isFinite(env) ? env : 15;
  }

  private async ratePercent(key: string, envKey: string, fallback: number) {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key } });
    if (setting && typeof setting.value === 'number') return setting.value;
    const env = Number(process.env[envKey]);
    return Number.isFinite(env) ? env : fallback;
  }

  async vatPercent() {
    return this.ratePercent('vatPercent', 'PLATFORM_VAT_PERCENT', 13);
  }

  async tdsPercent() {
    return this.ratePercent('tdsPercent', 'PLATFORM_TDS_PERCENT', 15);
  }

  async create(user: JwtUser, input: z.infer<typeof paymentCreateSchema>) {
    const [profile, creator, campaign, commissionPercent] = await Promise.all([
      this.prisma.creatorProfile.findUnique({ where: { userId: input.creatorId } }),
      this.prisma.user.findUnique({ where: { id: input.creatorId } }),
      this.prisma.campaign.findUnique({ where: { id: input.campaignId }, include: { brand: true } }),
      this.commissionPercent(),
    ]);
    // Brand payout initiation (approved: makers strong) — the campaign owner can
    // prepare a PENDING payout; operators still approve and release (maker–checker).
    const isCampaignOwner = user.role === 'BRAND' && campaign?.brand.userId === user.userId;
    if (!this.isOps(user.role) && !isCampaignOwner) {
      throw new ForbiddenException('Only the campaign brand or finance/admin can create payments');
    }
    const application = profile
      ? await this.prisma.application.findUnique({
          where: { campaignId_creatorId: { campaignId: input.campaignId, creatorId: profile.id } },
        })
      : null;
    if (!application) throw new NotFoundException('Accepted application not found for this creator/campaign');
    if (application.status !== 'ACCEPTED') {
      throw new ForbiddenException('Only accepted applications can be paid');
    }
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
          preparedById: user.userId,
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

  /** Maker–checker step 2: a different operator approves what another prepared. */
  async approve(user: JwtUser, paymentId: string) {
    if (!this.isOps(user.role)) {
      throw new ForbiddenException('Only finance/admin can approve payments');
    }
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'PENDING') throw new ForbiddenException('Only pending payments can be approved');
    if (payment.preparedById && payment.preparedById === user.userId) {
      throw new ForbiddenException('Maker–checker: preparer cannot approve their own payment');
    }
    if (payment.approvedById && payment.approvedById !== user.userId) {
      throw new ForbiddenException('Payment already approved by another operator');
    }
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'APPROVED' as const, approvedById: user.userId },
    });
  }

  /**
   * Maker–checker step 3 (release): whoever marks a payment PAID must be
   * neither the preparer nor the approver — two independent people, ideally
   * three, sign off on money movement.
   */
  async release(user: JwtUser, paymentId: string, body: { channel?: string; providerRef?: string; failed?: boolean; note?: string }) {
    if (!this.isOps(user.role)) {
      throw new ForbiddenException('Only finance/admin can release payments');
    }
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'APPROVED') throw new ForbiddenException('Only approved payments can be released');

    if (payment.preparedById === user.userId || payment.approvedById === user.userId) {
      throw new ForbiddenException('Maker–checker: release must be done by someone who did not prepare or approve this payment');
    }

    if (body.failed) {
      const note = body.note ? ` ${body.note}` : '';
      return this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' as const, description: payment.description ? `${payment.description}${note}` : `Disbursement failed${note}` },
      });
    }

    // Resolve the actual payout channel: explicit input wins, else the creator's default.
    let channel: $Enums.PayoutChannel | null;
    if (body.channel && (PAYOUT_CHANNELS as readonly string[]).includes(body.channel)) {
      channel = body.channel as $Enums.PayoutChannel;
    } else {
      const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: payment.creatorId } });
      channel = profile?.payoutChannel ?? null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID' as const,
          paidAt: new Date(),
          channel: channel ?? undefined,
          providerRef: body.providerRef || null,
          transactionId: body.providerRef || payment.transactionId,
        },
      });
      await tx.invoice.updateMany({
        where: { campaignId: payment.campaignId, status: 'DRAFT' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      return updated;
    });
  }

  /** Operator-side status corrections (FAILED/refund/cancel) — never bypassing maker–check for PAY. */
  async updateStatus(user: JwtUser, paymentId: string, status: string) {
    if (!this.isOps(user.role)) {
      throw new ForbiddenException('Only finance/admin can update payments');
    }
    const allowed = ['FAILED', 'REFUNDED', 'CANCELLED'];
    if (!allowed.includes(status)) throw new ForbiddenException('Use /approve or /release for payment lifecycle transitions');

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: status as never, paidAt: null },
    });
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

  /** Brand-facing invoice ledger: brands see their own drafts/bills, operators see everything. */
  async listInvoices(user: JwtUser, page = 1, limit = 20) {
    const where: Prisma.InvoiceWhereInput = {};
    if (user.role === 'BRAND') {
      const brand = await this.prisma.brand.findUnique({ where: { userId: user.userId } });
      if (!brand) {
        return { data: [], meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } };
      }
      where.brandId = brand.id;
    } else if (user.role === 'CREATOR') {
      throw new ForbiddenException('Only brands and operators manage invoices');
    } else if (!['ADMIN', 'FINANCE', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { campaign: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  async summary(user: JwtUser) {
    if (user.role === 'CREATOR') {
      const [totalEarned, paidCount, pendingCount, totalOutstanding, channel] = await Promise.all([
        this.prisma.payment.aggregate({ where: { creatorId: user.userId, status: 'PAID' }, _sum: { payoutAmount: true } }),
        this.prisma.payment.count({ where: { creatorId: user.userId, status: 'PAID' } }),
        this.prisma.payment.count({ where: { creatorId: user.userId, status: { in: ['PENDING', 'APPROVED'] } } }),
        this.prisma.payment.aggregate({ where: { creatorId: user.userId, status: { in: ['PENDING', 'APPROVED'] } }, _sum: { payoutAmount: true } }),
        this.prisma.creatorProfile.findUnique({ where: { userId: user.userId }, select: { payoutChannel: true, payoutChannelDetail: true, fallbackChannel: true } }),
      ]);
      return {
        totalEarned: totalEarned._sum.payoutAmount ?? 0,
        paidCount,
        pendingCount,
        totalOutstanding: totalOutstanding._sum.payoutAmount ?? 0,
        payoutChannel: channel?.payoutChannel ?? null,
        fallbackChannel: channel?.fallbackChannel ?? null,
      };
    }
    if (user.role === 'BRAND') {
      const brand = await this.prisma.brand.findUnique({ where: { userId: user.userId } });
      const campaignIds = brand
        ? await this.prisma.campaign.findMany({ where: { brandId: brand.id }, select: { id: true } }).then((c) => c.map((x) => x.id))
        : [];
      const [paid, billed, unpaid, invoiceCount] = await Promise.all([
        this.prisma.payment.aggregate({ where: { campaignId: { in: campaignIds }, status: 'PAID' }, _sum: { amount: true, commissionAmount: true, payoutAmount: true } }),
        this.prisma.invoice.aggregate({ where: { campaignId: { in: campaignIds }, status: 'PAID' }, _sum: { amount: true, commissionAmount: true } }),
        this.prisma.invoice.aggregate({ where: { campaignId: { in: campaignIds }, status: { in: ['SENT', 'DRAFT', 'OVERDUE'] } }, _sum: { amount: true } }),
        this.prisma.invoice.count({ where: { campaignId: { in: campaignIds } } }),
      ]);
      const vat = await this.vatPercent();
      return {
        totalBilled: billed._sum.amount ?? 0,
        invoiceCount,
        unpaidTotal: unpaid._sum.amount ?? 0,
        // Fee-transparent brand view (blueprint §1): creator payout + platform fee.
        payoutsTotal: paid._sum.payoutAmount ?? 0,
        commissionTotal: paid._sum.commissionAmount ?? 0,
        spendTotal: (paid._sum.amount ?? 0) + Math.round(((paid._sum.commissionAmount ?? 0) * vat) / 100),
        vatEstimate: Math.round((paid._sum.commissionAmount ?? 0) * (vat / 100)),
        commissionPercent: await this.commissionPercent(),
      };
    }
    // admin/finance
    const [gross, net, pending, commission, vat, tds] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { payoutAmount: true, commissionAmount: true } }),
      this.prisma.payment.aggregate({ where: { status: { in: ['PENDING', 'APPROVED'] } }, _sum: { amount: true, payoutAmount: true, commissionAmount: true } }),
      this.prisma.payment.aggregate({ _sum: { commissionAmount: true } }),
      this.vatPercent(),
      this.tdsPercent(),
    ]);
    const paidCommission = net._sum.commissionAmount ?? 0;
    const paidPayouts = net._sum.payoutAmount ?? 0;
    return {
      grossVolume: gross._sum.amount ?? 0,
      netPayouts: paidPayouts,
      commission: commission._sum.commissionAmount ?? 0,
      pending: pending._sum.amount ?? 0,
      payouts: await this.prisma.payment.count(),
      vatEstimate: Math.round(paidCommission * (vat / 100)),
      tdsEstimate: Math.round(paidPayouts * (tds / 100)),
    };
  }

  /**
   * Finance ledger (blueprint §1): Platform Revenue vs Creator Dues as two
   * separated figures, plus maker–checker queue and per-channel breakdown.
   */
  async financeOverview() {
    const [paid, reserved, awaitingApproval, awaitingRelease, byChannel, invoices, paidPayers, vat, tds] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true, payoutAmount: true, commissionAmount: true }, _count: true }),
      this.prisma.payment.aggregate({
        where: { status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { amount: true, payoutAmount: true, commissionAmount: true },
        _count: true,
      }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'APPROVED' } }),
      this.prisma.payment.groupBy({ by: ['channel'], where: { channel: { not: null }, status: 'PAID' }, _count: true, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ _sum: { amount: true, commissionAmount: true }, _count: true }),
      this.prisma.payment.groupBy({ by: ['creatorId'], where: { status: 'PAID' } }),
      this.vatPercent(),
      this.tdsPercent(),
    ]);

    const paidCommission = paid._sum.commissionAmount ?? 0;
    const paidPayouts = paid._sum.payoutAmount ?? 0;

    return {
      platformRevenue: {
        commissionCollected: paidCommission,
        reservedCommission: reserved._sum.commissionAmount ?? 0,
        vatOnCommission: Math.round(paidCommission * (vat / 100)),
        vatPercent: vat,
        total: paidCommission + Math.round(paidCommission * (vat / 100)),
      },
      creatorDues: {
        paidOut: paidPayouts,
        outstanding: reserved._sum.payoutAmount ?? 0,
        outstandingCount: reserved._count ?? 0,
        tdsWithheld: Math.round(paidPayouts * (tds / 100)),
        tdsPercent: tds,
      },
      grossVolume: paid._sum.amount ?? 0,
      volumePending: reserved._sum.amount ?? 0,
      payerCount: paidPayers.length,
      makerCheck: {
        awaitingApproval,
        awaitingRelease,
      },
      channels: byChannel.map((c) => ({
        channel: c.channel,
        count: c._count,
        amount: c._sum.amount ?? 0,
      })),
      invoices: {
        billed: invoices._sum.amount ?? 0,
        commissionOnBilled: invoices._sum.commissionAmount ?? 0,
        count: invoices._count ?? 0,
      },
    };
  }
}