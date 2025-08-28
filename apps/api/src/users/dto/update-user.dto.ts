import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'User avatar URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;
}
