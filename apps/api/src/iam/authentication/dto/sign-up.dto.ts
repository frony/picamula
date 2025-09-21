import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from '../../../users/dto/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    example: 'joe.doe@example.com',
    description: 'The user email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd123',
    description: 'The user password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'password too weak',
  })
  password: string;

  @ApiProperty({
    example: 'Joe Doe',
    description: 'The user name',
  })
  @IsString()
  name: string;
}
