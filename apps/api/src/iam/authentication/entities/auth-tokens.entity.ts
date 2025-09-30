import { Entity } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class AuthTokens {
  @ApiProperty({
    example: '...eyJzdWIiOjEsImVtYWlsI...',
    description: 'The JWT token for the session',
  })
  accessToken: string;

  @ApiProperty({
    example: '...eyJzdWIiOjEsInJlZnJlc...',
    description: 'The JWT token to refresh an expired accessToken',
  })
  refreshToken: string;
}
