import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyCampaignSchema, reviewApplicationSchema, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AiClient } from '../common/services/ai.client';
import { NotificationService } from '../notification/notification.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClient,
    private readonly notifications: NotificationService,
  ) {}

  private async applicantProfileOrThrow(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('Creator profile required');
    return profile;
  }

  async apply(user: JwtUser, campaignId: string, input: z.infer<typeof applyCampaignSchema>) {
    const profile = await this.applicantProfileOrThrow(user.userId);
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'RECRUITING') {
      throw new ForbiddenException('Campaign is not accepting applications');
    }
    const existing = await this.prisma.application.findUnique({
      where: { campaignId_creatorId: { campaignId, creatorId: profile.id } },
    });
    if (existing) throw new ForbiddenException('You already applied to this campaign');

    const application = await this.prisma.application.create({
      data: {
        campaignId,
        creatorId: profile.id,
        pitch: input.pitch,
        proposedRate: input.proposedRate,
      },
    });

    await this.notifications.notify({
      userId: campaign.createdById,
      event: 'APPLICATION_RECEIVED',
      title: 'New application received',
      body: `A creator applied to "${campaign.title}"`,
      link: `/campaign/${campaignId}`,
      types: ['IN_APP'],
    });
    return application;
  }

  /** Creator can withdraw their own application. */
  async withdraw(user: JwtUser, applicationId: string) {
    const profile = await this.applicantProfileOrThrow(user.userId);
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.creatorId !== profile.id) throw new ForbiddenException('Access denied');
    if (app.status === 'ACCEPTED' || app.status === 'REJECTED') {
      throw new ForbiddenException('Cannot withdraw a decided application');
    }
    return this.prisma.application.update({ where: { id: applicationId }, data: { status: 'WITHDRAWN' } });
  }

  private async isBrandOwner(user: JwtUser, campaignId: string) {
    if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { brand: true } });
    return !!campaign && campaign.brand.userId === user.userId;
  }

  async review(user: JwtUser, applicationId: string, input: z.infer<typeof reviewApplicationSchema>) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { campaign: { include: { brand: true } }, creator: { include: { user: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (!(await this.isBrandOwner(user, app.campaignId))) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: input.decision,
        brandNote: input.note || null,
        reviewedAt: new Date(),
        reviewedById: user.userId,
      },
    });

    await this.notifications.notify({
      userId: app.creator.user.id,
      event: input.decision === 'REJECTED' ? 'APPLICATION_REJECTED' : 'APPLICATION_ACCEPTED',
      title: input.decision === 'ACCEPTED' ? 'You are in! Application accepted' : 'Application update',
      body: `Your application to "${app.campaign?.title}" was ${input.decision.toLowerCase()}`,
      link: `/campaign/${app.campaignId}`,
      email: app.creator.user.email,
      types: ['IN_APP', 'EMAIL'],
    });
    return updated;
  }

  async listMine(user: JwtUser, scope: 'mine' | 'received' | 'all', page = 1, limit = 20) {
    const where: Prisma.ApplicationWhereInput = {};
    if (scope === 'mine') {
      if (user.role === 'CREATOR') {
        const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: user.userId } });
        if (!profile) return { data: [], meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } };
        where.creatorId = profile.id;
      } else {
        throw new ForbiddenException('Only creators can query own applications');
      }
    } else if (scope === 'received') {
      if (user.role === 'BRAND') {
        const campaignIds = await this.prisma.campaign.findMany({ where: { brand: { userId: user.userId } }, select: { id: true } });
        where.campaignId = { in: campaignIds.map((c) => c.id) };
      } else if (!['ADMIN', 'MANAGER'].includes(user.role)) {
        throw new ForbiddenException('Access denied');
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: {
          campaign: { select: { id: true, title: true, status: true, budgetMin: true, budgetMax: true } },
          creator: { include: { user: { select: { id: true, name: true, avatarUrl: true } }, platforms: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.application.count({ where }),
    ]);
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrevious: page > 1 },
    };
  }

  async findOne(user: JwtUser, applicationId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        campaign: { include: { brand: { select: { id: true, companyName: true } } } },
        creator: { include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } }, platforms: true, portfolio: { orderBy: { createdAt: 'desc' }, take: 6 } } },
        submissions: { orderBy: { version: 'desc' } },
      },
    });
    if (!app) throw new NotFoundException('Application not found');

    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: user.userId } });
    const isApplicant = profile && app.creatorId === profile.id;
    const isOwner = await this.isBrandOwner(user, app.campaignId);
    if (!isApplicant && !isOwner) throw new ForbiddenException('Access denied');
    return app;
  }

  // ------------------------------------------------------------ submissions
  async addSubmission(
    user: JwtUser,
    applicationId: string,
    input: { fileUrl: string; caption?: string; notes?: string },
  ) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'ACCEPTED') {
      throw new ForbiddenException('Submissions are only allowed for accepted applications');
    }
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: user.userId } });
    if (!profile || app.creatorId !== profile.id) throw new ForbiddenException('Access denied');

    const latest = await this.prisma.submission.findFirst({
      where: { applicationId },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;

    return this.prisma.submission.create({
      data: {
        applicationId,
        creatorId: user.userId,
        campaignId: app.campaignId,
        version,
        fileUrl: input.fileUrl,
        caption: input.caption || null,
        notes: input.notes || null,
        status: 'SUBMITTED',
      },
    });
  }

  async feedback(user: JwtUser, submissionId: string, input: { feedback: string; status?: string }) {
    const sub = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        application: {
          include: {
            campaign: { select: { title: true } },
            creator: { include: { user: { select: { id: true, email: true } } } },
          },
        },
      },
    });
    if (!sub) throw new NotFoundException('Submission not found');
    if (!(await this.isBrandOwner(user, sub.application.campaignId))) {
      if (user.role !== 'QA') throw new ForbiddenException('Access denied');
    }
    const status = (['APPROVED', 'IN_REVISION', 'REJECTED'].includes(input.status ?? '')
      ? input.status
      : 'IN_REVISION') as 'APPROVED' | 'IN_REVISION' | 'REJECTED';

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { feedback: input.feedback, status, feedbackAt: new Date() },
    });

    if (status === 'IN_REVISION') {
      await this.notifications.notify({
        userId: sub.application.creator.userId,
        event: 'REVISION_REQUEST',
        title: 'Revision requested',
        body: `Brand requested revisions on your submission for "${sub.application.campaign.title}"`,
        link: `/applications/${sub.applicationId}`,
        email: sub.application.creator.user.email,
        types: ['IN_APP', 'EMAIL'],
      });
    }
    if (status === 'APPROVED') {
      await this.notifications.notify({
        userId: sub.application.creator.userId,
        event: 'SUBMISSION_APPROVED',
        title: 'Submission approved!',
        body: `Your submission for "${sub.application.campaign.title}" was approved`,
        link: `/applications/${sub.applicationId}`,
        email: sub.application.creator.user.email,
        types: ['IN_APP', 'EMAIL'],
      });
    }
    return updated;
  }

  async aiAnalyze(user: JwtUser, submissionId: string) {
    const sub = await this.prisma.submission.findUnique({ where: { id: submissionId } });
    if (!sub) throw new NotFoundException('Submission not found');
    const app = await this.prisma.application.findUnique({ where: { id: sub.applicationId } });
    if (!app) throw new ForbiddenException('Access denied');
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: user.userId } });
    const isApplicant = profile && app.creatorId === profile.id;
    const isOwner = await this.isBrandOwner(user, app.campaignId);
    if (!isApplicant && !isOwner && user.role !== 'QA') throw new ForbiddenException('Access denied');

    const result = await this.ai.analyzeContent({
      fileUrl: sub.fileUrl,
      caption: sub.caption,
    });
    if (!result) return { data: null as unknown, note: 'AI analysis unavailable' };

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { aiAnalysis: result as unknown as Prisma.InputJsonValue },
    });
    return { data: result };
  }
}