import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplateService } from './email-template.service';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let mailService: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplateService,
        {
          provide: MailService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);
    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send a generic email', async () => {
      const emailData = {
        emailTo: 'test@example.com',
        emailFrom: 'sender@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        htmlMessage: '<p>Test HTML message</p>',
      };

      jest.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);

      await service.sendEmail(emailData);

      expect(mailService.sendMail).toHaveBeenCalledWith({
        email: 'test@example.com',
        message: 'Test message',
        htmlMessage: '<p>Test HTML message</p>',
        subject: 'Test Subject',
      });
    });

    it('should send email without htmlMessage', async () => {
      const emailData = {
        emailTo: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
      };

      jest.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);

      await service.sendEmail(emailData);

      expect(mailService.sendMail).toHaveBeenCalledWith({
        email: 'test@example.com',
        message: 'Test message',
        htmlMessage: undefined,
        subject: 'Test Subject',
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email using generic sendEmail function', async () => {
      const resetData = {
        email: 'test@example.com',
        resetUrl: 'http://localhost/reset?token=abc123',
      };

      jest.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

      await service.sendPasswordResetEmail(resetData);

      expect(service.sendEmail).toHaveBeenCalledWith({
        emailTo: 'test@example.com',
        emailFrom: undefined, // Will be set by configService in real usage
        subject: 'Band & Fan: Reset your password',
        message: 'Copy this URL and paste it in your browser: http://localhost/reset?token=abc123',
        htmlMessage: expect.stringContaining('http://localhost/reset?token=abc123'),
      });
    });
  });
}); 