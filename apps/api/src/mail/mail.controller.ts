import { Controller, Post, Body, Res } from '@nestjs/common';
import { MailService } from './mail.service';
import { DefaultEmailDto } from './dto/default-email.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';

@Auth(AuthType.Bearer)
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-email')
  async sendMailer(
    @Body() defaultEmail: DefaultEmailDto,
    @Res() response: any,
  ) {
    const mail = await this.mailService.sendMail(defaultEmail);
    return response.status(200).json({
      message: 'success',
      mail,
    });
  }
}
