import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    example: 'uuid-string',
    description: 'Specific refresh token to revoke (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  tokenId?: string;
} 