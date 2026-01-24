import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TripStatus } from '../entities/trip.entity';
import { CreateDestinationDto } from '../../destination/dto/create-destination.dto';
import { Type } from 'class-transformer';

export class CreateTripDto {
  @ApiProperty({
    example: 'Summer Vacation in Europe',
    description: 'Trip title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

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
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  destination: string;

  @ApiProperty({
    example: 'New York, USA',
    description: 'Starting city of the trip',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  startCity: string;

  @ApiProperty({
    example: '2024-07-01',
    description: 'Trip start date',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    example: '2024-07-15',
    description: 'Trip end date',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({
    example: TripStatus.PLANNING,
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDestinationDto)
  @IsOptional()
  destinations?: CreateDestinationDto[];
}
