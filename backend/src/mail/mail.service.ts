import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendResetPasswordEmail(
    email: string,
    resetLink: string,
  ): Promise<void> {
    const host =
      this.configService.get<string>('SMTP_HOST') ?? 'smtp.gmail.com';
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ??
      user ??
      'no-reply@easytrip.local';
    const fromName =
      this.configService.get<string>('SMTP_FROM_NAME') ?? 'EasyTrip Support';

    if (!user || !pass) {
      this.logger.warn(
        'SMTP credentials are not configured. Reset email was skipped.',
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Reset your EasyTrip password',
      html: `
        <p>Hello,</p>
        <p>We received a request to reset your password.</p>
        <p>
          Click this link to continue:
          <a href="${resetLink}">Reset Password</a>
        </p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }
}
