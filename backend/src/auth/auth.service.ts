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
  z,
} from '@ugcnp/shared';
import { UserRole, UserStatus } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  // ------------------------------------------------------------ register
  async register(body: z.infer<typeof registerSchema>) {
    const normalized = { ...body, email: body.email.toLowerCase() };
    const exists = await this.prisma.user.findUnique({ where: { email: normalized.email } });
    if (exists) throw new ConflictException('An account with this email already exists');

    const passwordHash = await argon2.hash(normalized.password);
    const user = await this.prisma.user.create({
      data: {
        name: normalized.name,
        email: normalized.email,
        phone: normalized.phone || null,
        passwordHash,
        role: normalized.role as UserRole,
        status: 'PENDING',
      },
    });

    if (normalized.role === 'CREATOR') {
      await this.prisma.creatorProfile.create({ data: { userId: user.id } });
    }
    if (normalized.role === 'BRAND') {
      await this.prisma.brand.create({
        data: { userId: user.id, companyName: normalized.name, contactPerson: normalized.name },
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
    const code = String(randomInt(100000, 999999));
    const ttl = this.config.get<number>('EMAIL_OTP_EXPIRES', 300);
    await this.prisma.verificationCode.create({
      data: {
        userId,
        email: email.toLowerCase(),
        codeHash: sha256(code),
        purpose,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    await this.notifications.notify({
      userId,
      event: 'SYSTEM',
      title: 'Your UGCNP verification code',
      body: `Use code ${code} to complete your ${purpose.toLowerCase()}. It expires in 5 minutes.`,
      email,
      types: ['EMAIL'],
    });
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
    if (!record || record.expiresAt < new Date() || record.codeHash !== sha256(body.code)) {
      throw new BadRequestException('Invalid or expired code');
    }
    if (body.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
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