import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Campaign, Prisma } from '@prisma/client';
import { campaignSchema, CAMPAIGN_STATUSES, CampaignStatus, CampaignObjective, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { assertTransition } from './campaign-state.machine';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { randomBytes } from 'crypto';

type CampaignInput = z.infer<typeof campaignSchema>;

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private slugify(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return `${base}-${randomBytes(4).toString('hex')}`;
  }

  private async getOwnedForBrand(brandId: string) {
    return this.prisma.brand.findUnique({ where: { id: brandId } });
  }

  /** Returns the brand id for a user, or throws if the user has no brand profile. */
  private async brandIdForUser(userId: string): Promise<string> {
    const brand = await this.prisma.brand.findUnique({ where: { userId } });
    if (!brand) throw new ForbiddenException('Brand profile required');
    return brand.id;
  }

  private async loadForUser(campaignId: string, user: JwtUser) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { brand: { select: { userId: true, id: true, companyName: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const isStaff = user.role === 'ADMIN' || user.role === 'MANAGER';
    if (campaign.brand.userId !== user.userId && !isStaff) {
      throw new ForbiddenException('Access denied');
    }
    return campaign;
  }

  async create(user: JwtUser, input: CampaignInput) {
    const brandId = await this.brandIdForUser(user.userId);
    const budget = input.budget ?? { amountMin: 0, amountMax: 0, currency: 'NPR', perCreator: true };
    const deadline = input.deadline instanceof Date ? input.deadline : new Date(input.deadline);

    const campaign = await this.prisma.campaign.create({
      data: {
        brandId,
        title: input.title,
        slug: this.slugify(input.title),
        description: input.description,
        objective: input.objective as CampaignObjective,
        product: input.product,
        targetAudience: (input.targetAudience as unknown as Prisma.InputJsonValue) ?? null,
        targetLocations: input.targetLocations,
        platforms: input.platforms as never,
        creatorRequirements: (input.creatorRequirements as unknown as Prisma.InputJsonValue) ?? {},
        deliverables: input.deliverables as unknown as Prisma.InputJsonValue,
        deadline,
        budgetMin: budget.amountMin,
        budgetMax: budget.amountMax,
        currency: budget.currency,
        perCreator: budget.perCreator,
        usageRights: input.usageRights,
        status: (input.status as CampaignStatus) ?? 'DRAFT',
        createdById: user.userId,
      },
      include: { brand: { select: { companyName: true } } },
    });
    return campaign;
  }

  async update(user: JwtUser, campaignId: string, input: Partial<CampaignInput>) {
    const existing = await this.loadForUser(campaignId, user);
    if (existing.status !== 'DRAFT' && !['ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Only drafts can be edited');
    }
    const budget = input.budget;
    const data: Prisma.CampaignUpdateInput = {};
    if (input.title !== undefined) {
      data.title = input.title;
      data.slug = this.slugify(input.title);
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.objective !== undefined) data.objective = input.objective as CampaignObjective;
    if (input.product !== undefined) data.product = input.product;
    if (input.targetLocations !== undefined) data.targetLocations = input.targetLocations;
    if (input.platforms !== undefined) data.platforms = input.platforms as never;
    if (input.deliverables !== undefined) data.deliverables = input.deliverables as unknown as Prisma.InputJsonValue;
    if (input.creatorRequirements !== undefined) data.creatorRequirements = input.creatorRequirements as unknown as Prisma.InputJsonValue;
    if (input.targetAudience !== undefined) data.targetAudience = input.targetAudience as unknown as Prisma.InputJsonValue;
    if (input.deadline !== undefined) data.deadline = input.deadline instanceof Date ? input.deadline : new Date(input.deadline);
    if (budget !== undefined) {
      data.budgetMin = budget.amountMin;
      data.budgetMax = budget.amountMax;
      data.currency = budget.currency;
      data.perCreator = budget.perCreator;
    }
    if (input.usageRights !== undefined) data.usageRights = input.usageRights;

    const updated = await this.prisma.campaign.update({ where: { id: campaignId }, data });
    return updated;
  }

  async transition(user: JwtUser, campaignId: string, to: CampaignStatus) {
    const existing = await this.loadForUser(campaignId, user);
    if (!CAMPAIGN_STATUSES.includes(to)) throw new NotFoundException('Invalid status');
    assertTransition(existing.status, to);

    const data: Prisma.CampaignUpdateInput = { status: to };
    if (to === 'RECRUITING' && !existing.publishedAt) data.publishedAt = new Date();
    if (to === 'COMPLETED') data.completedAt = new Date();

    const updated = await this.prisma.campaign.update({ where: { id: campaignId }, data });

    // notify creator applicants if moving into production/review
    if (to === 'SHORTLISTING' || to === 'PRODUCTION') {
      const applicants = await this.prisma.application.findMany({
        where: { campaignId, status: to === 'SHORTLISTING' ? 'PENDING' : 'SHORTLISTED' },
        include: { creator: { include: { user: { select: { id: true, email: true } } } } },
      });
      for (const app of applicants) {
        await this.notifications.notify({
          userId: app.creator.user.id,
          event: 'CAMPAIGN_STATUS_CHANGE',
          title: 'Campaign status updated',
          body: `Campaign "${existing.title}" moved to ${to}`,
          link: `/campaign/${campaignId}`,
          email: app.creator.user.email,
          types: ['IN_APP', 'EMAIL'],
        });
      }
    }
    return updated;
  }

  async invite(user: JwtUser, campaignId: string, creatorProfileId: string, message?: string) {
    const campaign = await this.loadForUser(campaignId, user);
    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      throw new ForbiddenException('Campaign is not accepting invites');
    }
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    const invite = await this.prisma.campaignInvite.upsert({
      where: { campaignId_creatorId: { campaignId, creatorId: creatorProfileId } },
      create: { campaignId, creatorId: creatorProfileId, message: message || null },
      update: {},
    });

    await this.notifications.notify({
      userId: creator.user.id,
      event: 'CAMPAIGN_INVITE',
      title: 'You are invited to a campaign',
      body: `Brand invited you to join campaign "${campaign.title}"`,
      link: `/campaign/${campaignId}`,
      email: creator.user.email,
      types: ['IN_APP', 'EMAIL'],
    });
    return invite;
  }

  async listMine(user: JwtUser, query: { page?: number; limit?: number; status?: CampaignStatus }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));

    let where: Prisma.CampaignWhereInput = {};
    if (user.role === 'BRAND') {
      const brand = await this.prisma.brand.findUnique({ where: { userId: user.userId } });
      if (!brand) return { data: [], meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } };
      where = { brandId: brand.id };
    } else if (user.role === 'CREATOR') {
      const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: user.userId } });
      if (!profile) return { data: [], meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } };
      where = {
        applications: { some: { creatorId: profile.id } },
      };
    }
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          brand: { select: { id: true, companyName: true } },
          _count: { select: { applications: true } },
        },
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

  async discover(query: {
    page?: number;
    limit?: number;
    category?: string;
    location?: string;
    platform?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const conditions: Prisma.CampaignWhereInput[] = [{ status: 'RECRUITING' }, { deadline: { gte: new Date() } }];
    if (query.category) {
      conditions.push({ creatorRequirements: { path: ['categories'], array_contains: [query.category] } } as Prisma.CampaignWhereInput);
    }
    if (query.location) {
      conditions.push({ targetLocations: { has: query.location } });
    }
    if (query.platform) {
      conditions.push({ platforms: { has: query.platform as never } } as Prisma.CampaignWhereInput);
    }
    if (query.search) {
      conditions.push({ OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] });
    }
    const where: Prisma.CampaignWhereInput = { AND: conditions };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          brand: { select: { id: true, companyName: true, industry: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { publishedAt: 'desc' },
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

  async findOne(campaignId: string, user?: JwtUser) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        brand: { select: { id: true, companyName: true, industry: true, userId: true } },
        applications: user
          ? {
              include: {
                creator: {
                  include: { user: { select: { id: true, name: true, avatarUrl: true } } },
                },
              },
            }
          : false,
        _count: { select: { applications: true, submissions: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }
}