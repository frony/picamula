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
} from 'class-validator';
import { TripStatus } from '../entities/trip.entity';

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
}
