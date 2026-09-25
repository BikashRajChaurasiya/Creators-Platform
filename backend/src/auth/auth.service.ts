import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, createHash, randomInt } from 'crypto';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthTokens,
  loginSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  brandSignupSchema,
  creatorSignupSchema,
  INTERNAL_ROLES,
  z,
} from '@ugcnp/shared';
import { UserRole, UserStatus } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notification/email.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  // ------------------------------------------------------------ register
  async register(body: z.infer<typeof registerSchema>) {
    const normalized = { ...body, email: body.email.toLowerCase() };
    if (INTERNAL_ROLES.includes(normalized.role as UserRole)) {
      throw new BadRequestException('Cannot register an internal role');
    }
    const exists = await this.prisma.user.findUnique({ where: { email: normalized.email } });
    if (exists) throw new ConflictException('An account with this email already exists');
    if (normalized.username) {
      const nameTaken = await this.prisma.user.findUnique({
        where: { username: normalized.username.toLowerCase() },
      });
      if (nameTaken) throw new ConflictException('That username is already taken');
    }

    const passwordHash = await argon2.hash(normalized.password);
    const user = await this.prisma.user.create({
      data: {
        name: normalized.name,
        email: normalized.email,
        username: normalized.username ? normalized.username.toLowerCase() : null,
        phone: normalized.phone || null,
        passwordHash,
        role: normalized.role as UserRole,
        status: 'PENDING',
      },
    });

    const profile = normalized.profile;
    if (normalized.role === 'CREATOR') {
      const p = (profile ?? {}) as z.infer<typeof creatorSignupSchema>;
      await this.prisma.creatorProfile.create({
        data: {
          userId: user.id,
          bio: p.bio || null,
          city: p.city || null,
          district: p.district || null,
          category: p.category || null,
          instagram: p.instagram || null,
          tiktok: p.tiktok || null,
          youtube: p.youtube || null,
          facebook: p.facebook || null,
          followersEstimate: p.followersEstimate,
          engagementRate: p.engagementRate,
        },
      });
    }
    if (normalized.role === 'BRAND') {
      const p = (profile ?? {}) as z.infer<typeof brandSignupSchema>;
      await this.prisma.brand.create({
        data: {
          userId: user.id,
          companyName: p.companyName || normalized.name,
          industry: p.industry,
          website: p.website || null,
          contactPerson: normalized.name,
          description: p.description || null,
          address: p.address || null,
        },
      });
    }

    await this.sendOtp(user.id, normalized.email, 'REGISTER');

    return { data: { userId: user.id, requiresEmailVerification: true } };
  }

  // ------------------------------------------------------------ tokens
  private async issueTokens(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    phone?: string | null;
    refreshTokenVersion: number;
  }): Promise<AuthTokens> {
    const accessExpires = this.config.get<number>('JWT_ACCESS_EXPIRES', 900);
    const refreshExpires = this.config.get<number>('JWT_REFRESH_EXPIRES', 2592000);
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role, rtv: user.refreshTokenVersion };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpires,
    });

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpires * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: accessExpires,
      refreshExpiresIn: refreshExpires,
      tokenType: 'Bearer',
    };
  }

  async login(body: z.infer<typeof loginSchema>) {
    const email = body.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await argon2.verify(user.passwordHash, body.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new UnauthorizedException('Account is suspended');
    }
    if (user.status === 'PENDING') {
      throw new UnauthorizedException('Please verify your email before signing in');
    }
    const tokens = await this.issueTokens(user);
    return { data: { user: this.sanitizeUser(user), ...tokens } };
  }

  async verifyAccessToken(token: string): Promise<JwtUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        name: string;
        role: UserRole;
        rtv: number;
      }>(token, { secret: this.config.get<string>('JWT_ACCESS_SECRET') });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === 'SUSPENDED' || user.status === 'BANNED' || user.status === 'DELETED') {
        return null;
      }
      if (user.refreshTokenVersion !== payload.rtv) return null;
      return {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        refreshTokenVersion: user.refreshTokenVersion,
      };
    } catch {
      return null;
    }
  }

  async refresh(body: z.infer<typeof refreshTokenSchema>): Promise<AuthTokens> {
    const tokenHash = sha256(body.refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (record.user.status === 'SUSPENDED' || record.user.status === 'BANNED') {
      throw new UnauthorizedException('Account is suspended');
    }
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(record.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } }),
      this.prisma.user.update({ where: { id: userId }, data: { refreshTokenVersion: { increment: 1 } } }),
    ]);
  }

  // ------------------------------------------------------------ OTP
  private async sendOtp(userId: string, email: string, purpose: string): Promise<void> {
    const emailLower = email.toLowerCase();

    const recent = await this.prisma.verificationCode.findFirst({
      where: { email: emailLower, purpose, createdAt: { gte: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && !recent.consumedAt) {
      throw new BadRequestException('A code was sent recently. Please wait about a minute before requesting another.');
    }

    const code = String(randomInt(100000, 999999));
    const ttl = this.config.get<number>('EMAIL_OTP_EXPIRES', 300);
    await this.prisma.verificationCode.create({
      data: {
        userId,
        email: emailLower,
        codeHash: sha256(code),
        purpose,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    // In-app record (never stores the plaintext code) + branded email.
    const theme = await this.email.platformTheme();
    const purposeLabel =
      purpose === 'LOGIN' ? 'log in' : purpose === 'PASSWORD_RESET' ? 'reset your password' : 'verify your account';
    await this.prisma.notification.create({
      data: {
        userId,
        event: 'SYSTEM',
        type: 'EMAIL',
        title: `Your ${theme.brandName} verification code was sent`,
        body: `A 6-digit code to ${purposeLabel} was emailed to ${emailLower}. It expires in 5 minutes.`,
      },
    });
    await this.email.sendOtpBranded({
      to: emailLower,
      code,
      purpose,
      brandName: theme.brandName,
      logoUrl: theme.logoUrl,
      primaryColor: theme.primaryColor,
    });
    this.logger.log(`[OTP] sent ${purpose} code for ${emailLower}`);
  }

  async requestOtp(body: z.infer<typeof requestOtpSchema>) {
    const email = body.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (body.purpose === 'REGISTER') {
      if (!user) {
        user = await this.prisma.user.create({
          data: { name: email.split('@')[0], email, status: 'PENDING', role: 'CREATOR' },
        });
        await this.prisma.creatorProfile.create({ data: { userId: user.id } });
      }
      if (user.status === 'ACTIVE') throw new BadRequestException('Account already verified');
      await this.sendOtp(user.id, email, 'REGISTER');
      return { data: { sent: true } };
    }

    if (body.purpose === 'LOGIN' || body.purpose === 'PASSWORD_RESET') {
      if (!user || user.status === 'BANNED') {
        // do not reveal account existence
        return { data: { sent: true } };
      }
      if (user.status === 'ACTIVE' || body.purpose === 'PASSWORD_RESET') {
        await this.sendOtp(user.id, email, body.purpose);
      }
    }
    return { data: { sent: true } };
  }

  async verifyOtp(body: z.infer<typeof verifyOtpSchema>) {
    const email = body.email.toLowerCase();
    const record = await this.prisma.verificationCode.findFirst({
      where: { email, purpose: body.purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Code expired, please request a new one');
    }
    if (record.attempts >= 5) {
      throw new BadRequestException('Too many attempts, please request a new code');
    }
    if (record.codeHash !== sha256(body.code)) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

    if (body.purpose === 'REGISTER') {
      await this.prisma.user.update({
        where: { id: record.userId! },
        data: { emailVerified: true, status: 'ACTIVE' },
      });
    }
    if (body.purpose === 'PASSWORD_RESET') {
      return { data: { verified: true } };
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId! } });
    const tokens = await this.issueTokens(user);
    return { data: { user: this.sanitizeUser(user), ...tokens } };
  }

  async resetPassword(body: {
    email: string;
    code: string;
    newPassword: string;
  }) {
    const email = body.email.toLowerCase();
    const record = await this.prisma.verificationCode.findFirst({
      where: { email, purpose: 'PASSWORD_RESET', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Code expired, please request a new one');
    }
    if (record.attempts >= 5) {
      throw new BadRequestException('Too many attempts, please request a new code');
    }
    if (record.codeHash !== sha256(body.code)) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid or expired code');
    }
    const passwordHash = await argon2.hash(body.newPassword);
    await this.prisma.$transaction([
      this.prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: record.userId! },
        data: { passwordHash, emailVerified: true, status: 'ACTIVE', refreshTokenVersion: { increment: 1 } },
      }),
    ]);
    return { data: { ok: true } };
  }

  // ------------------------------------------------------------ google (stub)
  async googleAuth(): Promise<never> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    if (!clientId) {
      throw new NotFoundException(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to enable.',
      );
    }
    // Redirect flow lives in the controller when configured.
    throw new NotFoundException('Google OAuth configuration incomplete');
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
    };
  }
}