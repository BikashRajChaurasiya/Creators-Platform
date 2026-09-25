import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { disputeRaiseSchema, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

const SLA_DAYS = 7;

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private async operationsLeadId() {
    const lead = await this.prisma.user.findFirst({
      where: { role: 'MANAGER', status: 'ACTIVE' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (lead) return lead.id;
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return admin?.id ?? null;
  }

  async raise(user: JwtUser, input: z.infer<typeof disputeRaiseSchema>) {
    if (user.role !== 'CREATOR' && user.role !== 'BRAND') {
      throw new ForbiddenException('Only creators and brands can raise disputes');
    }
    const campaign = await this.prisma.campaign.findUnique({ where: { id: input.campaignId }, include: { brand: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Validate the raiser has standing: brand owns the campaign, creator applied to it.
    if (user.role === 'BRAND' && campaign.brand.userId !== user.userId) {
      throw new ForbiddenException('You do not own this campaign');
    }
    if (user.role === 'CREATOR') {
      const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: user.userId }, select: { id: true } });
      if (!profile) throw new ForbiddenException('Creator profile required');
      const standing = await this.prisma.application.findFirst({
        where: input.applicationId
          ? { id: input.applicationId, campaignId: campaign.id, creatorId: profile.id }
          : { campaignId: campaign.id, creatorId: profile.id },
      });
      if (!standing) throw new ForbiddenException('You must be an applicant to this campaign to raise a dispute');
    }

    const existing = await this.prisma.dispute.findFirst({
      where: {
        raisedById: user.userId,
        campaignId: campaign.id,
        applicationId: input.applicationId ?? null,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
    });
    if (existing) throw new BadRequestException('An open dispute already exists for this engagement');

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 24 * 60 * 60 * 1000);
    const assigneeId = await this.operationsLeadId();

    const dispute = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dispute.create({
        data: {
          campaignId: campaign.id,
          applicationId: input.applicationId ?? null,
          raisedById: user.userId,
          subject: input.subject,
          description: input.description,
          status: 'OPEN',
          slaDueAt,
        },
      });
      await tx.task.create({
        data: {
          title: `[Dispute] ${input.subject}`,
          description: `${input.description}\n\nSLA due: ${slaDueAt.toISOString()}\nRaised by: ${user.userId}`,
          type: 'DISPUTE',
          priority: 'HIGH',
          dueDate: slaDueAt,
          assigneeId,
          disputeId: d.id,
          createdById: user.userId,
          campaignId: campaign.id,
        },
      });
      return d;
    });

    if (assigneeId) {
      await this.notifications.notify({
        userId: assigneeId,
        event: 'SYSTEM',
        title: 'New dispute requires review',
        body: `"${input.subject}" — SLA ${slaDueAt.toLocaleDateString()}`,
        link: '/admin/disputes',
        types: ['IN_APP'],
      });
    }

    return dispute;
  }

  async mine(user: JwtUser) {
    const disputes = await this.prisma.dispute.findMany({
      where: { raisedById: user.userId },
      include: {
        task: { select: { id: true, dueDate: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const campaignIds = [...new Set(disputes.map((d) => d.campaignId).filter((id): id is string => !!id))];
    const campaigns = await this.prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, title: true },
    });
    const campaignMap = new Map(campaigns.map((c) => [c.id, c]));
    return disputes.map((d) => ({
      ...d,
      campaign: d.campaignId ? (campaignMap.get(d.campaignId) ?? null) : null,
    }));
  }
}