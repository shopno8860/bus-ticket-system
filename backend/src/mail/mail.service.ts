import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

/** SMTP-backed transactional emails (reset password, booking, refund notices). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  private getSmtpConfig() {
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

    return {
      host,
      port,
      user,
      pass,
      fromEmail,
      fromName,
    };
  }

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const { host, port, user, pass } = this.getSmtpConfig();
    if (!user || !pass) {
      this.logger.warn('SMTP credentials are not configured. Email was skipped.');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  /** Low-level send; no-ops when SMTP is not configured. */
  async sendMail(params: {
    to: string;
    subject: string;
    html: string;
    attachments?: Mail.Attachment[];
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return;
    }

    const { fromEmail, fromName } = this.getSmtpConfig();
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });
  }

  /** Password reset link email. */
  async sendResetPasswordEmail(
    email: string,
    resetLink: string,
  ): Promise<void> {
    await this.sendMail({
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

  /** Ticket / receipt email after successful payment. */
  async sendBookingConfirmationEmail(params: {
    to: string;
    customerName: string;
    bookingReference: string;
    ticketPdf?: Buffer;
    ticketPdfPath?: string;
  }): Promise<void> {
    const attachment: Mail.Attachment | null = params.ticketPdfPath
      ? {
          filename: `Ticket-${params.bookingReference}.pdf`,
          path: params.ticketPdfPath,
          contentType: 'application/pdf',
        }
      : params.ticketPdf
        ? {
            filename: `Ticket-${params.bookingReference}.pdf`,
            content: params.ticketPdf,
            contentType: 'application/pdf',
          }
        : null;

    await this.sendMail({
      to: params.to,
      subject: 'Booking Confirmed',
      html: `
        <p>Hello ${params.customerName},</p>
        <p>Your booking has been confirmed.</p>
        <p>Booking reference: <strong>${params.bookingReference}</strong></p>
        <p>Your ticket PDF is attached to this email.</p>
      `,
      attachments: attachment ? [attachment] : [],
    });
  }

  /** Notify passenger when a booking is cancelled. */
  async sendBookingCancellationEmail(params: {
    to: string;
    customerName: string;
    bookingReference: string;
  }): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject: 'Booking Cancelled',
      html: `
        <p>Hello ${params.customerName},</p>
        <p>Your booking has been cancelled.</p>
        <p>Booking reference: <strong>${params.bookingReference}</strong></p>
      `,
    });
  }

  /** Notify passenger when a refund is approved/processed. */
  async sendRefundApprovedEmail(params: {
    to: string;
    customerName: string;
    bookingReference: string;
    refundAmount: string;
  }): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject: 'Refund Approved',
      html: `
        <p>Hello ${params.customerName},</p>
        <p>Your refund request has been approved.</p>
        <p>Booking reference: <strong>${params.bookingReference}</strong></p>
        <p>Refund amount: <strong>${params.refundAmount}</strong></p>
      `,
    });
  }
}
