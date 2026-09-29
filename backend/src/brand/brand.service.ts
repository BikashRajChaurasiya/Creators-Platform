import { Injectable, NotFoundException } from '@nestjs/common';
import { brandProfileSchema, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async ensureBrand(userId: string) {
    let brand = await this.prisma.brand.findUnique({ where: { userId } });
    if (!brand) {
      brand = await this.prisma.brand.create({
        data: { userId, companyName: 'Unnamed Company', contactPerson: 'Unnamed' },
      });
    }
    return brand;
  }

  async getMyBrand(userId: string) {
    const brand = await this.ensureBrand(userId);
    const result = await this.prisma.brand.findUnique({
      where: { id: brand.id },
      include: {
        // The brand profile page renders the logo and display name from
        // `profile.user`, so the relation has to be loaded here. Without it
        // `profile.user` is always undefined and the Avatar silently falls
        // back to initials even though a logo was uploaded.
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
        campaigns: { select: { id: true, title: true, status: true, budgetMin: true, budgetMax: true } },
      },
    });
    return { ...result, campaignCount: result?.campaigns.length ?? 0 };
  }

  async upsertBrand(userId: string, input: z.infer<typeof brandProfileSchema>) {
    const brand = await this.ensureBrand(userId);
    const updated = await this.prisma.brand.update({
      where: { id: brand.id },
      data: {
        companyName: input.companyName,
        industry: input.industry,
        website: input.website || null,
        contactPerson: input.contactPerson,
        description: input.description || null,
        address: input.address || null,
      },
    });
    await this.cache.del(`brand:${userId}`);
    return updated;
  }

  async submitVerification(userId: string, documentUrl: string) {
    const brand = await this.ensureBrand(userId);
    return this.prisma.$transaction(async (tx) => {
      // Re-submitting while a request is already queued is a no-op rather than
      // a second open review, which would leave two rows competing to decide
      // the same brand's status.
      const pending = await tx.brandVerification.findFirst({
        where: { brandId: brand.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
      if (pending) return pending;

      const created = await tx.brandVerification.create({
        data: { brandId: brand.id, documentUrl, status: 'PENDING' },
      });
      // The portal reads `verificationStatus` off the brand, so the flag has to
      // be moved too — creating the review row alone left it UNVERIFIED and the
      // submission looked like it had done nothing.
      await tx.brand.update({
        where: { id: brand.id },
        data: { verificationStatus: 'PENDING' },
      });
      return created;
    });
  }

  async getBrandPublic(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }
}