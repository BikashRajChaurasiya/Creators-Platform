import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotificationEvent, NotificationType } from '@ugcnp/shared';
import { PrismaService } from '../prisma/prisma.service';

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface OtpInput {
  to: string;
  code: string;
  purpose: string;
  brandName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly mode: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.mode = config.get<string>('EMAIL_MODE', 'console').toLowerCase();
    this.from = config.get<string>('EMAIL_FROM', 'UGCNP <no-reply@ugcnp.com>');
    const host = config.get<string>('SMTP_HOST', '');
    if (this.mode === 'smtp' && host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(config.get('SMTP_PORT', '587')),
        secure: Number(config.get('SMTP_PORT', '587')) === 465,
        auth: {
          user: config.get<string>('SMTP_USER', ''),
          pass: config.get<string>('SMTP_PASS', ''),
        },
      });
    } else {
      this.transporter = null;
    }
  }

  async send(input: MailInput): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({ from: this.from, ...input });
      return;
    }
    // Console/dev mode: surface the mail payload in logs so flows can be verified.
    this.logger.log(`[EMAIL:${this.mode}] to=${input.to} subject="${input.subject}"`);
    this.logger.log(`[EMAIL:${this.mode}] body=${input.text.slice(0, 400)}`);
    if (input.html) {
      this.logger.log(`[EMAIL:${this.mode}] html=<${input.html.slice(0, 120)}…>`);
    }
  }

  async sendOtpBranded({ to, code, purpose, brandName, logoUrl, primaryColor }: OtpInput): Promise<void> {
    const brand = brandName ?? 'UGCNP';
    const name = brand.replace(/['"]/g, '');
    const tone = primaryColor ?? '#1B5E3B';
    const purposeLabel =
      purpose === 'LOGIN' ? 'log in' : purpose === 'PASSWORD_RESET' ? 'reset your password' : 'verify your account';
    const text = `Your ${name} verification code is ${code}. Use code ${code} to ${purposeLabel}. It expires in 5 minutes. If you did not request this, you can safely ignore this email.`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
            <tr>
              <td style="padding:32px 32px 24px;border-bottom:3px solid ${tone};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left">
                      ${
                        logoUrl
                          ? `<img src="${logoUrl}" alt="${name}" width="120" style="height:auto;border-radius:8px;" />`
                          : `<span style="font-size:22px;font-weight:bold;color:${tone};">${name}</span>`
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <h1 style="margin:0 0 12px;font-size:20px;color:#1c1917;">Your ${purposeLabel.startsWith('log') ? 'login' : purposeLabel.split(' ')[0]} code</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#57534e;">
                  Enter this code to ${purposeLabel} on ${name}. The code expires in 5 minutes.
                </p>
                <div style="background:#fafaf9;border:1px dashed #e7e5e4;border-radius:12px;padding:20px;text-align:center;">
                  <span style="display:inline-block;font-size:34px;font-weight:bold;letter-spacing:8px;color:${tone};font-variant-numeric:tabular-nums;">${code}</span>
                </div>
                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#a8a29e;">
                  For your security, this code works only once and expires shortly after it is sent. Never share it with
                  anyone — our team will never ask for your code.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#fafaf9;text-align:center;border-top:1px solid #f5f5f4;">
                <p style="margin:0;font-size:12px;color:#a8a29e;">
                  You are receiving this email because a ${purposeLabel} was requested for your account. If this wasn't
                  you, please contact support.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const subject =
      purpose === 'LOGIN' ? `Your ${name} login code` : purpose === 'PASSWORD_RESET' ? `Reset your ${name} password` : `Verify your ${name} account`;
    await this.send({ to, subject, text, html });
  }

  async platformTheme() {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: 'theme' } });
    const theme = (row?.value as { brandName?: string; logoUrl?: string; primaryColor?: string }) ?? {};
    const fallback = (await this.prisma.platformSetting.findUnique({ where: { key: 'brandName' } }))?.value as string | undefined;
    return {
      brandName: theme.brandName ?? fallback ?? 'UGCNP',
      logoUrl: theme.logoUrl ?? '',
      primaryColor: theme.primaryColor ?? '#1B5E3B',
    };
  }

  sendOtp(to: string, code: string, purpose: string): Promise<void> {
    return this.sendOtpBranded({ to, code, purpose });
  }

  sendEventEmail(
    to: string,
    event: NotificationEvent,
    title: string,
    body: string,
  ): Promise<void> {
    return this.send({ to, subject: title, text: body });
  }

  getNotificationCopy(event: NotificationEvent): Record<NotificationType, string> {
    const map: Record<string, Record<NotificationType, string>> = {
      CAMPAIGN_INVITE: { IN_APP: 'You were invited to a campaign', EMAIL: 'New campaign invitation', PUSH: 'Campaign invite' },
      APPLICATION_RECEIVED: { IN_APP: 'You received a new application', EMAIL: 'New application received', PUSH: 'New application' },
      APPLICATION_ACCEPTED: { IN_APP: 'Your application was accepted', EMAIL: 'Application accepted', PUSH: 'Application accepted' },
      APPLICATION_REJECTED: { IN_APP: 'Your application was not selected', EMAIL: 'Application update', PUSH: 'Application update' },
      REVISION_REQUEST: { IN_APP: 'A revision was requested on your submission', EMAIL: 'Revision requested', PUSH: 'Revision requested' },
      SUBMISSION_APPROVED: { IN_APP: 'Your submission was approved', EMAIL: 'Submission approved', PUSH: 'Submission approved' },
      PAYMENT_COMPLETED: { IN_APP: 'A payment was completed', EMAIL: 'Payment received', PUSH: 'Payment received' },
      NEW_MESSAGE: { IN_APP: 'New message', EMAIL: 'New message', PUSH: 'New message' },
      CAMPAIGN_STATUS_CHANGE: { IN_APP: 'A campaign changed status', EMAIL: 'Campaign update', PUSH: 'Campaign update' },
      SYSTEM: { IN_APP: 'System notification', EMAIL: 'UGCNP notification', PUSH: 'UGCNP notification' },
    };
    return map[event] ?? map.SYSTEM;
  }
}