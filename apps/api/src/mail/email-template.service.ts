import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

export interface EmailData {
  emailTo: string;
  emailFrom?: string; // defaults to EMAIL_DEFAULT_SENDER env var
  subject: string;
  message: string;
  htmlMessage?: string;
}

export interface PasswordResetEmailData {
  email: string;
  resetUrl: string;
}

/**
 * EmailTemplateService provides reusable email templates and a generic email sending function.
 * 
 * Usage examples:
 * 
 * // Send a simple text email
 * await emailTemplateService.sendEmail({
 *   emailTo: 'user@example.com',
 *   subject: 'Welcome to Band & Fan',
 *   message: 'Thank you for joining our community!'
 * });
 * 
 * // Send an HTML email
 * await emailTemplateService.sendEmail({
 *   emailTo: 'user@example.com',
 *   emailFrom: 'custom@example.com', // Optional, defaults to EMAIL_DEFAULT_SENDER
 *   subject: 'Your Account Details',
 *   message: 'Here are your account details.',
 *   htmlMessage: '<h1>Welcome!</h1><p>Here are your account details.</p>'
 * });
 * 
 * // Send password reset email (uses the generic function internally)
 * await emailTemplateService.sendPasswordResetEmail({
 *   email: 'user@example.com',
 *   resetUrl: 'http://localhost/reset?token=abc123'
 * });
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail(data: EmailData): Promise<void> {
    const { emailTo, emailFrom, subject, message, htmlMessage } = data;
    
    this.logger.log(`EmailTemplateService: Sending email to ${emailTo}`);
    this.logger.log(`EmailTemplateService: Subject: ${subject}`);
    
    await this.mailService.sendMail({
      email: emailTo,
      message,
      htmlMessage,
      subject,
    });
    
    this.logger.log(`EmailTemplateService: Email sent successfully to ${emailTo}`);
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const { email, resetUrl } = data;
    
    this.logger.log(`EmailTemplateService: Preparing password reset email for ${email}`);
    this.logger.log(`EmailTemplateService: Reset URL: ${resetUrl}`);
    
    const subject = 'JuntaTribo: Reset your password';
    const message = `Copy this URL and paste it in your browser: ${resetUrl}`;
    const htmlMessage = `<p>Copy this URL and paste it in your browser: ${resetUrl}</p>
<p>Or <a href="${resetUrl}">click on this link to reset your password</a></p>`;

    await this.sendEmail({
      emailTo: email,
      emailFrom: this.configService.get<string>('EMAIL_DEFAULT_SENDER'),
      subject,
      message,
      htmlMessage,
    });
  }
} 