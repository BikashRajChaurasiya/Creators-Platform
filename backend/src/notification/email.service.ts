import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotificationEvent, NotificationType } from '@ugcnp/shared';

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly mode: string;

  constructor(config: ConfigService) {
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
    // Console/dev mode: surfface the mail payload in logs so flows can be verified.
    this.logger.log(`[EMAIL:${this.mode}] to=${input.to} subject="${input.subject}"`);
    this.logger.log(`[EMAIL:${this.mode}] body=${input.text.slice(0, 400)}`);
  }

  sendOtp(to: string, code: string, purpose: string): Promise<void> {
    const subject =
      purpose === 'LOGIN' ? 'Your UGCNP login code' : 'Your UGCNP verification code';
    return this.send({
      to,
      subject,
      text: `Use verification code ${code} to complete your ${purpose.toLowerCase()} on UGCNP. It expires in 5 minutes.`,
      html: `<p>Use verification code <strong>${code}</strong> to complete your ${purpose.toLowerCase()} on UGCNP.</p><p>It expires in 5 minutes.</p>`,
    });
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