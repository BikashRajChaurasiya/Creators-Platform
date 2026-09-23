import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { creatorProfile: { include: { portfolio: true, platforms: true } }, brand: true },
    });
    if (user.passwordHash) delete (user as { passwordHash?: string }).passwordHash;
    return user;
  }

  async updateMe(
    userId: string,
    data: { name?: string; phone?: string | null; avatarUrl?: string },
  ) {
    if (data.phone === null || data.phone === '') data.phone = null;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
      },
      include: { creatorProfile: true, brand: true },
    });
  }

  async findByIds(ids: string[]): Promise<Prisma.UserGetPayload<null>[]> {
    return this.prisma.user.findMany({ where: { id: { in: ids } } });
  }
}