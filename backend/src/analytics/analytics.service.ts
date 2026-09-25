import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiClient } from '../common/services/ai.client';
import { JwtUser } from '../common/decorators/current-user.decorator';

interface DateRange {
  from?: string;
  to?: string;
}

export interface SeriesPoint {
  date: string;
  users: number;
  campaigns: number;
  applications: number;
  submissions: number;
  payments: number;
  platformRevenue: number;
}

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

  private periodRange(from?: string, to?: string, defaultDays = 30) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(Date.now() - defaultDays * 86_400_000);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid "from" date');
    if (Number.isNaN(end.getTime())) throw new BadRequestException('Invalid "to" date');
    if (start.getTime() > end.getTime()) throw new BadRequestException('"from" must not be after "to"');
    return { start, end };
  }

  async platformSeries(user: JwtUser, range: DateRange) {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) throw new ForbiddenException('Access denied');
    const { start, end } = this.periodRange(range.from, range.to);
    const window = { gte: start, lte: end };
    const select = { createdAt: true } as const;
    const [users, campaigns, applications, submissions, payments] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: window }, select }),
      this.prisma.campaign.findMany({ where: { createdAt: window }, select }),
      this.prisma.application.findMany({ where: { createdAt: window }, select }),
      this.prisma.submission.findMany({ where: { createdAt: window }, select }),
      this.prisma.payment.findMany({ where: { createdAt: window }, select: { createdAt: true, amount: true, commissionAmount: true } }),
    ]);

    const empty = () =>
      ({ users: 0, campaigns: 0, applications: 0, submissions: 0, payments: 0, platformRevenue: 0 }) as Omit<SeriesPoint, 'date'>;
    const map = new Map<string, Omit<SeriesPoint, 'date'>>();

    const bump = (points: { createdAt: Date }[], key: keyof Omit<SeriesPoint, 'date'>) => {
      for (const p of points) {
        const date = p.createdAt.toISOString().slice(0, 10);
        const slot = map.get(date) ?? empty();
        slot[key] += 1;
        map.set(date, slot);
      }
    };
    bump(users, 'users');
    bump(campaigns, 'campaigns');
    bump(applications, 'applications');
    bump(submissions, 'submissions');
    for (const p of payments) {
      const date = p.createdAt.toISOString().slice(0, 10);
      const slot = map.get(date) ?? empty();
      slot.payments += 1;
      slot.platformRevenue += p.commissionAmount ?? 0;
      map.set(date, slot);
    }

    const series: SeriesPoint[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= end.getTime()) {
      const date = cursor.toISOString().slice(0, 10);
      series.push({ date, ...(map.get(date) ?? empty()) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return { from: start.toISOString(), to: end.toISOString(), series, days: series.length };
  }

  async platformStats(user: JwtUser, { from, to }: DateRange) {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) throw new ForbiddenException('Access denied');
    const { start, end } = this.periodRange(from, to);
    const window = { gte: start, lte: end };
    const [users, creators, brands, campaigns, activeCampaigns, applications, submissions, payments, revenue, invites, tasks, disputes, period] =
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
        Promise.all([
          this.prisma.user.count({ where: { createdAt: window } }),
          this.prisma.campaign.count({ where: { createdAt: window } }),
          this.prisma.application.count({ where: { createdAt: window } }),
          this.prisma.submission.count({ where: { createdAt: window } }),
          this.prisma.payment.aggregate({ where: { createdAt: window }, _sum: { amount: true, commissionAmount: true } }),
        ]),
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
      period: {
        from: start.toISOString(),
        to: end.toISOString(),
        newUsers: period[0],
        newCampaigns: period[1],
        newApplications: period[2],
        newSubmissions: period[3],
        grossVolume: period[4]._sum.amount ?? 0,
        platformRevenue: period[4]._sum.commissionAmount ?? 0,
      },
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