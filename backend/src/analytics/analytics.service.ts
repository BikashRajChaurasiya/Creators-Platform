import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiClient } from '../common/services/ai.client';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClient,
  ) {}

  async creatorStats(user: JwtUser, profileId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new ForbiddenException('Creator not found');
    if (profile.userId !== user.userId && !['ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
    const [applications, submissions, approved, rejected, payments] = await Promise.all([
      this.prisma.application.count({ where: { creatorId: profileId } }),
      this.prisma.submission.count({ where: { creator: { creatorProfile: { id: profileId } } } }),
      this.prisma.submission.count({ where: { creator: { creatorProfile: { id: profileId } }, status: 'APPROVED' } }),
      this.prisma.submission.count({ where: { creator: { creatorProfile: { id: profileId } }, status: 'REJECTED' } }),
      this.prisma.payment.aggregate({ where: { creator: { creatorProfile: { id: profileId } }, status: 'PAID' }, _sum: { payoutAmount: true } }),
    ]);
    return {
      profileId,
      applications,
      submissions,
      approvedSubmissions: approved,
      rejectedSubmissions: rejected,
      approvalRate: submissions ? Math.round((approved / submissions) * 100) : 0,
      totalEarned: payments._sum.payoutAmount ?? 0,
    };
  }

  async brandStats(user: JwtUser, brandId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new ForbiddenException('Brand not found');
    if (brand.userId !== user.userId && !['ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
    const [total, byStatus, applications, submissions, spend, published] = await Promise.all([
      this.prisma.campaign.count({ where: { brandId } }),
      this.prisma.campaign.groupBy({ by: ['status'], where: { brandId }, _count: { _all: true } }),
      this.prisma.application.count({ where: { campaign: { brandId } } }),
      this.prisma.submission.count({ where: { campaign: { brand: { id: brandId } } } }),
      this.prisma.payment.aggregate({ where: { campaign: { brandId }, status: 'PAID' }, _sum: { amount: true } }),
      this.prisma.campaign.count({ where: { brandId, status: 'PUBLISHED' } }),
    ]);
    return {
      brandId,
      totalCampaigns: total,
      published: published,
      statusBreakdown: byStatus,
      totalApplications: applications,
      totalSubmissions: submissions,
      totalSpend: spend._sum.amount ?? 0,
    };
  }

  async platformStats(user: JwtUser, { from, to }: { from?: string; to?: string }) {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) throw new ForbiddenException('Access denied');
    const whereDate = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    const [users, creators, brands, campaigns, activeCampaigns, applications, submissions, payments, revenue, invites, tasks, disputes] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.creatorProfile.count(),
        this.prisma.brand.count(),
        this.prisma.campaign.count(),
        this.prisma.campaign.count({ where: { status: { in: ['RECRUITING', 'SHORTLISTING', 'PRODUCTION', 'REVIEW'] } } }),
        this.prisma.application.count(),
        this.prisma.submission.count(),
        this.prisma.payment.count(),
        this.prisma.payment.aggregate({ _sum: { commissionAmount: true, amount: true } }),
        this.prisma.campaignInvite.count(),
        this.prisma.task.count({ where: { status: { not: 'DONE' } } }),
        this.prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      ]);
    return {
      users,
      creators,
      brands,
      campaigns,
      activeCampaigns,
      applications,
      submissions,
      payments,
      grossVolume: revenue._sum.amount ?? 0,
      platformRevenue: revenue._sum.commissionAmount ?? 0,
      invitesSent: invites,
      openTasks: tasks,
      openDisputes: disputes,
      period: whereDate,
    };
  }

  // ------------------------------------------------------------ AI hooks
  async match(user: JwtUser, payload: unknown) {
    if (!['BRAND', 'ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
    return this.ai.matchCreators(payload);
  }

  async generateCopy(payload: unknown) {
    return this.ai.generateCopy(payload);
  }

  async predict(payload: unknown) {
    return this.ai.predict(payload);
  }
}