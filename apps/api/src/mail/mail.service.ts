import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { DefaultEmailDto } from './dto/default-email.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async sendMail(defaultEmail: DefaultEmailDto) {
    const {
      email,
      message,
      htmlMessage,
      subject,
    }: {
      email: string;
      message: string;
      htmlMessage?: string;
      subject?: string;
    } = defaultEmail;

    try {
      this.logger.log(`Attempting to send email to ${email}`);
      this.logger.log(`Email configuration: host=${this.configService.get<string>('EMAIL_HOST')}, port=${this.configService.get<string>('EMAIL_PORT')}, user=${this.configService.get<string>('EMAIL_USERNAME')}`);
      
      await this.mailerService.sendMail({
        from: this.configService.get<string>('EMAIL_DEFAULT_SENDER'),
        to: email,
        subject:
          subject || this.configService.get<string>('EMAIL_DEFAULT_SUBJECT'),
        text: message,
        html: `${htmlMessage}`,
      });

      this.logger.log(`Email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      this.logger.error(`Error details:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      throw error;
    }
  }
}
