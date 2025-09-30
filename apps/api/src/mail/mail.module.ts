import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailTemplateService } from './email-template.service';
import { ConfigModule } from '@nestjs/config';
import { MailController } from './mail.controller';

@Module({
  imports: [ConfigModule],
  providers: [MailService, EmailTemplateService],
  exports: [MailService, EmailTemplateService],
  controllers: [MailController],
})
export class MailModule {}
