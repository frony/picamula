import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: '...eyJzdWIiOjEsImVtYWlsIjoibWZyb255QHlha...',
    description: 'The refresh token created on signin',
  })
  @IsNotEmpty()
  refreshToken: string;
}
