import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

export class CreateDestinationDto {
  @ApiProperty({
    example: 'Paris, France',
    description: 'Destination name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 0,
    description: 'Order in the trip itinerary',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;

  @ApiProperty({
    example: '2024-03-15',
    description: 'Arrival date (YYYY-MM-DD format)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'arrivalDate must be in YYYY-MM-DD format' })
  arrivalDate?: string;

  @ApiProperty({
    example: '2024-03-15',
    description: 'Departure date (YYYY-MM-DD format)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'departureDate must be in YYYY-MM-DD format' })
  departureDate?: string;

  @ApiProperty({
    example: 48.8566,
    description: 'Latitude of the destination',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    example: 48.8566,
    description: 'Longitude of the destination',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
