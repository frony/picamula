import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({
    example: '...eyJzdWIiOjEsImVtYWlsI...',
    description: 'The JWT token for the session',
  })
  accessToken: string;

  @ApiProperty({
    example: '...eyJzdWIiOjEsInJlZnJlc...',
    description: 'The JWT token to refresh an expired accessToken',
    required: false,
  })
  refreshToken?: string;
} 