import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { createTransport, type Transporter } from 'nodemailer';

import { renderInvitationEmail } from '@repo/emails/invitation';
import { renderPasswordResetEmail } from '@repo/emails/password-reset';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MailService.name);

    const host = this.config.get<string>('SMTP_HOST', 'localhost');
    const port = this.config.get<number>('SMTP_PORT', 54325);
    this.from = this.config.get<string>(
      'SMTP_FROM',
      'noreply@jetadisyon.local',
    );

    const user = this.config.get<string>('SMTP_USER', '');
    const pass = this.config.get<string>('SMTP_PASS', '');

    this.transporter = createTransport({
      host,
      port,
      secure: false,
      ...(user ? { auth: { user, pass } } : {}),
    });
  }

  async sendInvitationEmail(
    to: string,
    inviteLink: string,
    tenantName: string,
  ) {
    const html = await renderInvitationEmail({ inviteLink, tenantName });

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `JetAdisyon - ${tenantName} davetiyesi`,
      html,
    });

    this.logger.info({ to, tenantName }, 'Invitation email sent');
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    const html = await renderPasswordResetEmail({ resetLink });

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'JetAdisyon - Şifre Sıfırlama',
      html,
    });

    this.logger.info({ to }, 'Password reset email sent');
  }
}
