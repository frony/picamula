import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../entities/trip.entity';
import { CreateMediaFileDto } from './create-media-file.dto';

export class UpdateTripDto {
  @ApiProperty({
    example: 'Summer Vacation in Europe',
    description: 'Trip title',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    example: 'A wonderful trip across European cities',
    description: 'Trip description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: 'Paris, France',
    description: 'Trip destination',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  destination?: string;

  @ApiProperty({
    example: 'New York, USA',
    description: 'Starting city of the trip',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  startCity?: string;

  @ApiProperty({
    example: '2024-07-01',
    description: 'Trip start date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    example: '2024-07-15',
    description: 'Trip end date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    example: TripStatus.CONFIRMED,
    description: 'Trip status',
    enum: TripStatus,
    required: false,
  })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;

  @ApiProperty({
    example: 5000.00,
    description: 'Trip budget in USD',
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  budget?: number;

  @ApiProperty({
    example: ['john@example.com', 'jane@example.com'],
    description: 'List of participant emails',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participants?: string[];

  @ApiProperty({
    example: [
      { day: 1, activities: ['Visit Eiffel Tower', 'Seine River cruise'] },
      { day: 2, activities: ['Louvre Museum', 'Champs-Élysées shopping'] }
    ],
    description: 'Trip itinerary',
    required: false,
  })
  @IsOptional()
  itinerary?: any[];

  @ApiProperty({
    description: 'Array of media files (images/videos) to add to the trip',
    type: [CreateMediaFileDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMediaFileDto)
  @IsOptional()
  mediaFiles?: CreateMediaFileDto[];
}
