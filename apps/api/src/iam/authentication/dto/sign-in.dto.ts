import {
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({
    example: 'joe.doe@example.com',
    description: "The user's email",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd',
    description: 'Confirm the password',
  })
  @MinLength(10)
  password: string;

  @ApiProperty({
    example: '...eyJzdWIiOjEsImVtYWlsIjoibWZyb255QHlha...',
    description: 'The two-factor authentication code',
  })
  @IsOptional()
  @IsNumberString()
  tfaCode?: string;

  @ApiProperty({
    example: 'base64EncodedCaptchaPayload',
    description: 'ALTCHA captcha verification token',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
