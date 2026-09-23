import { Injectable, NotFoundException } from '@nestjs/common';
import { brandProfileSchema, z } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
      include: { campaigns: { select: { id: true, title: true, status: true, budgetMin: true, budgetMax: true } } },
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
    await this.redis.del(`brand:${userId}`);
    return updated;
  }

  async submitVerification(userId: string, documentUrl: string) {
    const brand = await this.ensureBrand(userId);
    return this.prisma.brandVerification.create({
      data: { brandId: brand.id, documentUrl, status: 'PENDING' },
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