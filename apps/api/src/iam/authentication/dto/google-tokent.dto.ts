import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleTokenDto {
  @ApiProperty({
    example: '1234aksdjhcnjkdc...',
    description: 'OAuth token from Google',
  })
  @IsNotEmpty()
  token: string;
}
