import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  loginSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  z,
} from '@ugcnp/shared';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

// reset-password body is intentionally permissive; validated inline in the service
const resetPasswordBody = (body: unknown) => body as { email: string; code: string; newPassword: string };

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: z.infer<typeof registerSchema>) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>) {
    return this.auth.login(body);
  }

  @Public()
  @Post('request-otp')
  requestOtp(@Body(new ZodValidationPipe(requestOtpSchema)) body: z.infer<typeof requestOtpSchema>) {
    return this.auth.requestOtp(body);
  }

  @Public()
  @Post('verify-otp')
  verifyOtp(@Body(new ZodValidationPipe(verifyOtpSchema)) body: z.infer<typeof verifyOtpSchema>) {
    return this.auth.verifyOtp(body);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.auth.resetPassword(resetPasswordBody(body));
  }

  @Public()
  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: z.infer<typeof refreshTokenSchema>) {
    return this.auth.refresh(body);
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }, @CurrentUser('id') userId: string) {
    if (body.refreshToken) await this.auth.logout(body.refreshToken);
    return { data: { ok: true } };
  }

  @Post('logout-all')
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.auth.logoutAll(userId);
    return { data: { ok: true } };
  }

  @Get('me')
  me(@CurrentUser() user: unknown) {
    return { data: user };
  }

  // Google OAuth stubs — activate by setting GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
  @Public()
  @Get('google')
  googleInit(@Res() res: Response) {
    this.logger.warn('Google OAuth requested but not configured.');
    res.status(501).json({ statusCode: 501, message: 'Google OAuth not configured' });
  }

  @Public()
  @Get('google/callback')
  googleCallback(@Query() query: { code?: string; error?: string }, @Res() res: Response) {
    if (query.error) {
      return res.redirect('/auth?provider=google&error=' + encodeURIComponent(query.error));
    }
    if (!query.code) {
      return res.redirect('/auth?provider=google&error=missing_code');
    }
    res.status(501).json({ statusCode: 501, message: 'Google OAuth not configured' });
  }
}