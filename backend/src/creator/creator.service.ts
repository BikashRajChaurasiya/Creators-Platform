import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { creatorProfileSchema, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const FILE_KINDS = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER'] as const;

@Injectable()
export class CreatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async ensureProfile(userId: string) {
    let profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.creatorProfile.create({ data: { userId } });
    }
    return profile;
  }

  async getMyProfile(userId: string) {
    const profile = await this.ensureProfile(userId);
    return this.prisma.creatorProfile.findUnique({
      where: { id: profile.id },
      include: {
        portfolio: { orderBy: { createdAt: 'desc' } },
        platforms: true,
        user: { select: { id: true, name: true, username: true, avatarUrl: true, updatedAt: true } },
      },
    });
  }

  async upsertProfile(userId: string, input: z.infer<typeof creatorProfileSchema>) {
    const existing = await this.ensureProfile(userId);

    if (input.username) {
      const normalized = input.username.toLowerCase();
      const taken = await this.prisma.user.findFirst({
        where: { username: normalized, id: { not: userId } },
      });
      if (taken) throw new BadRequestException('That username is already taken');
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      if (input.username) {
        await tx.user.update({ where: { id: userId }, data: { username: input.username.toLowerCase() } });
      }
      return tx.creatorProfile.update({
        where: { id: existing.id },
        data: {
          bio: input.bio || null,
          city: input.city || null,
          district: input.district || null,
          language: input.language,
          category: input.category || null,
          instagram: input.instagram || null,
          tiktok: input.tiktok || null,
          youtube: input.youtube || null,
          facebook: input.facebook || null,
          skills: input.skills,
          rateMin: input.rateMin,
          rateMax: input.rateMax,
          availableForWork: input.availableForWork,
          followersEstimate: input.followersEstimate,
          engagementRate: input.engagementRate,
          collaborations: input.collaborations?.length ? input.collaborations : undefined,
          payoutChannel: input.payoutChannel ?? null,
          payoutChannelDetail: input.payoutChannelDetail || null,
          fallbackChannel: input.fallbackChannel ?? null,
          fallbackChannelDetail: input.fallbackChannelDetail || null,
        },
        include: { portfolio: true, platforms: true },
      });
    });

    await this.prisma.platformLink.deleteMany({ where: { profileId: profile.id } });
    const links = [
      { platform: 'INSTAGRAM', url: input.instagram },
      { platform: 'TIKTOK', url: input.tiktok },
      { platform: 'YOUTUBE', url: input.youtube },
      { platform: 'FACEBOOK', url: input.facebook },
    ].filter((l) => !!l.url);
    if (links.length) {
      await this.prisma.platformLink.createMany({
        data: links.map((l) => ({ profileId: profile.id, platform: l.platform, url: l.url as string })),
      });
    }

    await this.redis.del(`creator:profile:${userId}`);
    return profile;
  }

  async addPortfolio(
    userId: string,
    item: { title: string; url: string; kind: string; caption?: string; thumbnail?: string },
  ) {
    const profile = await this.ensureProfile(userId);
    if (!FILE_KINDS.includes(item.kind as (typeof FILE_KINDS)[number])) {
      throw new BadRequestException('Invalid file kind');
    }
    return this.prisma.portfolioItem.create({
      data: {
        profileId: profile.id,
        title: item.title,
        url: item.url,
        kind: item.kind as Prisma.EnumFileKindFieldUpdateOperationsInput as never,
        caption: item.caption || null,
        thumbnail: item.thumbnail || null,
      },
    });
  }

  async removePortfolio(userId: string, itemId: string) {
    const profile = await this.ensureProfile(userId);
    await this.prisma.portfolioItem.deleteMany({ where: { id: itemId, profileId: profile.id } });
    return { ok: true };
  }

  async submitVerification(userId: string, documentUrl: string) {
    const profile = await this.ensureProfile(userId);
    return this.prisma.creatorVerification.create({
      data: { profileId: profile.id, documentUrl, status: 'PENDING' },
    });
  }

  async getProfilePublic(profileId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: profileId },
      include: {
        portfolio: { orderBy: { createdAt: 'desc' } },
        platforms: true,
user: { select: { id: true, name: true, username: true, avatarUrl: true, updatedAt: true } },
      },
    });
    if (!profile) throw new NotFoundException('Creator profile not found');
    return profile;
  }

  async discover(query: {
    page?: number;
    limit?: number;
    category?: string;
    location?: string;
    language?: string;
    minFollowers?: number;
    available?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));

    const conditions: Prisma.CreatorProfileWhereInput[] = [];
    if (query.available !== undefined) conditions.push({ availableForWork: query.available });
    if (query.category) conditions.push({ category: query.category });
    if (query.location) conditions.push({ city: query.location });
    if (query.language) conditions.push({ language: { has: query.language } });
    if (query.minFollowers) conditions.push({ followersEstimate: { gte: query.minFollowers } });
    if (query.search) {
      conditions.push({
        OR: [{ bio: { contains: query.search, mode: 'insensitive' } }, { skills: { has: query.search } }],
      });
    }

    const where: Prisma.CreatorProfileWhereInput = conditions.length ? { AND: conditions } : {};
    const include = {
      user: { select: { id: true, name: true, username: true, avatarUrl: true, updatedAt: true } },
      platforms: true,
    } as const;

    const [items, total] = await Promise.all([
      this.prisma.creatorProfile.findMany({ where, include, skip: (page - 1) * limit, take: limit, orderBy: { updatedAt: 'desc' } }),
      this.prisma.creatorProfile.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }
}