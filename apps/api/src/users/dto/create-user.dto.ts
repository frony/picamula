import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'John',
    description: `The user's first name`,
  })
  @IsNotEmpty()
  @Length(1, 50)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: `The user's last name`,
  })
  @IsNotEmpty()
  @Length(1, 50)
  lastName: string;

  @ApiProperty({ example: 'P@ssw0rd', description: "The user's password" })
  @IsNotEmpty()
  @Length(8, 20)
  password: string;

  @ApiProperty({ example: 'P@ssw0rd', description: 'Confirm the password' })
  @IsNotEmpty()
  @Length(8, 20)
  confirmPassword?: string;

  @ApiProperty({ example: 'joe.doe@example.com', description: "User's email" })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '555-123-4567',
    description: "The user's phone number",
  })
  @IsPhoneNumber('US')
  @IsOptional()
  phone?: string;
}
