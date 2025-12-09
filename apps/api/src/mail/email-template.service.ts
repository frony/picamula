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
    
    const subject = 'Reset your password - JuntaTribo';
    const message = `Please reset your password by clicking the following link: ${resetUrl}`;
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Reset Your Password</h2>
        <p>We received a request to reset your password for your JuntaTribo account.</p>
        <p>Click the button below to reset your password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </p>
        <p style="color: #6B7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #6B7280; font-size: 14px; word-break: break-all;">${resetUrl}</p>
        <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">This link will expire soon for security reasons.</p>
        <p style="color: #6B7280; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `;

    await this.sendEmail({
      emailTo: email,
      emailFrom: this.configService.get<string>('EMAIL_DEFAULT_SENDER'),
      subject,
      message,
      htmlMessage,
    });
  }
} 