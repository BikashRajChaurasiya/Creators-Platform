import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { UsersService } from '../users/users.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly users: UsersService,
  ) {}

  async listUsers(query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    q?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where: Prisma.UserWhereInput = {
      role: (query.role as Prisma.UserWhereInput['role']) ?? undefined,
      status: (query.status as Prisma.UserWhereInput['status']) ?? undefined,
    };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true, role: true, status: true,
          emailVerified: true, avatarUrl: true, createdAt: true, updatedAt: true,
          _count: { select: { creatorSubmissions: true, paymentsReceived: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  async setUserStatus(actor: JwtUser, userId: string, status: string, ip?: string) {
    const allowed = ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'];
    if (!allowed.includes(status)) throw new ForbiddenException('Invalid status');
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status: status as never } });
    await this.audit.log(
      { actor, action: 'user.status.update', targetType: 'User', targetId: userId, metadata: { status, email: updated.email } },
      ip,
    );
    return updated;
  }

  async setUserRole(actor: JwtUser, userId: string, role: string, ip?: string) {
    const allowed = ['CREATOR', 'BRAND', 'ADMIN', 'MANAGER', 'QA', 'FINANCE'];
    if (!allowed.includes(role)) throw new ForbiddenException('Invalid role');
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role: role as never } });
    await this.audit.log(
      { actor, action: 'user.role.update', targetType: 'User', targetId: userId, metadata: { role, email: updated.email } },
      ip,
    );
    return updated;
  }

  // ------------------------------------------------------------ campaigns
  async listCampaigns(query: { page?: number; limit?: number; status?: string; q?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where: Prisma.CampaignWhereInput = {
      status: (query.status as Prisma.CampaignWhereInput['status']) ?? undefined,
    };
    if (query.q) {
      where.OR = [{ title: { contains: query.q, mode: 'insensitive' } }];
    }
    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: { brand: { select: { id: true, companyName: true } }, _count: { select: { applications: true, submissions: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  // ------------------------------------------------------------ tasks
  async listTasks(query: { page?: number; limit?: number; status?: string; type?: string }) {
    const where: Prisma.TaskWhereInput = {
      status: query.status || undefined,
      type: query.type || undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: { dispute: { select: { id: true, subject: true, status: true, slaDueAt: true } } },
        orderBy: { createdAt: 'desc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
        take: query.limit ?? 20,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { data: items, meta: { page: query.page ?? 1, limit: query.limit ?? 20, total, totalPages: Math.ceil(total / (query.limit ?? 20)), hasNext: false, hasPrevious: false } };
  }

  async createTask(actor: JwtUser, input: { title: string; description?: string; assigneeId?: string; campaignId?: string; priority?: string; dueDate?: string; type?: string }) {
    const task = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description || null,
        assigneeId: input.assigneeId || null,
        campaignId: input.campaignId || null,
        priority: input.priority || 'MEDIUM',
        type: input.type || 'GENERAL',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdById: actor.userId,
      },
    });
    await this.audit.log({ actor, action: 'task.create', targetType: 'Task', targetId: task.id, metadata: { title: task.title } });
    return task;
  }

  async updateTask(actor: JwtUser, taskId: string, input: { status?: string; title?: string; priority?: string; assigneeId?: string | null }) {
    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: input.status,
        title: input.title,
        priority: input.priority,
        assigneeId: input.assigneeId,
        completedAt: input.status === 'DONE' ? new Date() : null,
      },
    });
    await this.audit.log({ actor, action: 'task.update', targetType: 'Task', targetId: taskId, metadata: { status: task.status } });
    return task;
  }

  // ------------------------------------------------------------ disputes
  async listDisputes(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        include: {
          task: { select: { id: true, status: true, dueDate: true, assigneeId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dispute.count(),
    ]);
    const raiserIds = [...new Set(items.map((d) => d.raisedById))];
    const campaignIds = [...new Set(items.map((d) => d.campaignId).filter((id): id is string => !!id))];
    const appIds = [...new Set(items.map((d) => d.applicationId).filter((id): id is string => !!id))];
    const [raisers, campaigns, applications] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: raiserIds } },
        select: { id: true, name: true, email: true, role: true },
      }),
      this.prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, title: true },
      }),
      this.prisma.application.findMany({
        where: { id: { in: appIds } },
        select: { id: true, pitch: true },
      }),
    ]);
    const raiserMap = new Map(raisers.map((u) => [u.id, u]));
    const campaignMap = new Map(campaigns.map((c) => [c.id, c]));
    const appMap = new Map(applications.map((a) => [a.id, a]));
    const now = Date.now();
    return {
      data: items.map((d) => ({
        ...d,
        raisedBy: raiserMap.get(d.raisedById) ?? null,
        campaign: d.campaignId ? (campaignMap.get(d.campaignId) ?? null) : null,
        application: d.applicationId ? (appMap.get(d.applicationId) ?? null) : null,
        sla: d.slaDueAt
          ? {
              dueAt: d.slaDueAt,
              remainingSeconds: Math.max(0, Math.floor((d.slaDueAt.getTime() - now) / 1000)),
              breached: d.slaDueAt.getTime() < now && d.status !== 'RESOLVED' && d.status !== 'CLOSED',
            }
          : null,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  async resolveDispute(actor: JwtUser, disputeId: string, resolution: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dispute.update({
        where: { id: disputeId },
        data: { resolution, status: 'RESOLVED', resolvedById: actor.userId, resolvedAt: new Date(), slaDueAt: null },
      });
      const task = await tx.task.findFirst({ where: { disputeId } });
      if (task) {
        await tx.task.update({ where: { id: task.id }, data: { status: 'DONE', completedAt: new Date() } });
      }
      return d;
    });
    await this.audit.log({ actor, action: 'dispute.resolve', targetType: 'Dispute', targetId: disputeId, metadata: { resolution } });
    return updated;
  }

  // ------------------------------------------------------------ settings
  async getSettings() {
    const rows = await this.prisma.platformSetting.findMany();
    const get = (key: string, fallback: unknown) => {
      const row = rows.find((r) => r.key === key);
      return row ? row.value : fallback;
    };
    const envCommission = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 15);
    const envVat = Number(process.env.PLATFORM_VAT_PERCENT ?? 13);
    const envTds = Number(process.env.PLATFORM_TDS_PERCENT ?? 15);
    return {
      commissionPercent: (get('commissionPercent', envCommission) as number) ?? 15,
      vatPercent: (get('vatPercent', envVat) as number) ?? 13,
      tdsPercent: (get('tdsPercent', envTds) as number) ?? 15,
      theme: get('theme', {
        primaryColor: '#1B5E3B',
        accentColor: '#A3E635',
        logoUrl: '',
        brandName: 'UGCNP',
      }),
      maintenanceMode: get('maintenanceMode', false),
      signupsOpen: get('signupsOpen', true),
      emailFrom: get('emailFrom', 'UGCNP <no-reply@ugcnp.com>'),
    };
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    return {
      theme: settings.theme,
      signupsOpen: settings.signupsOpen,
      maintenanceMode: settings.maintenanceMode,
    };
  }

  async getPublicStats() {
    const [creators, brands, campaigns, applications, campaignsCompleted, paymentsProcessed] = await Promise.all([
      this.prisma.creatorProfile.count(),
      this.prisma.brand.count(),
      this.prisma.campaign.count({ where: { status: 'RECRUITING' } }),
      this.prisma.application.count(),
      this.prisma.campaign.count({ where: { status: { in: ['COMPLETED', 'PUBLISHED'] } } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    ]);
    return {
      creators,
      brands,
      campaigns,
      applications,
      campaignsCompleted,
      paymentsProcessed: paymentsProcessed._sum.amount ?? 0,
    };
  }

  async updateSettings(actor: JwtUser, input: z.infer<typeof import('@ugcnp/shared').platformSettingsSchema>, ip?: string) {
    const entries = Object.entries(input as Record<string, unknown>);
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          create: { key, value: value as never },
          update: { value: value as never },
        }),
      ),
    );
    await this.audit.log({ actor, action: 'settings.update', metadata: { keys: entries.map(([k]) => k) } }, ip);
    return this.getSettings();
  }

  async reportsSummary(actor: JwtUser) {
    await this.audit.log({ actor, action: 'reports.summary' });
    const [users, creators, brands, campaigns, pendingApps, submissions, revenue, disputes, tasks] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.creatorProfile.count(),
      this.prisma.brand.count(),
      this.prisma.campaign.count(),
      this.prisma.application.count({ where: { status: 'PENDING' } }),
      this.prisma.submission.count(),
      this.prisma.payment.aggregate({ _sum: { commissionAmount: true, amount: true }, _count: true }),
      this.prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      this.prisma.task.count({ where: { status: { not: 'DONE' } } }),
    ]);
    return {
      users,
      creators,
      brands,
      campaigns,
      pendingApplications: pendingApps,
      submissions,
      grossVolume: revenue._sum.amount ?? 0,
      platformRevenue: revenue._sum.commissionAmount ?? 0,
      openDisputes: disputes,
      openTasks: tasks,
    };
  }
}