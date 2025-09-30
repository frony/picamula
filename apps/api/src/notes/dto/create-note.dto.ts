import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({
    example: 'Remember to pack sunscreen and bring the camera for sunset photos.',
    description: 'The content of the note',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({
    example: '2024-03-15T10:30:00Z',
    description: 'The date associated with the note',
  })
  @IsDateString()
  date: string;
}

