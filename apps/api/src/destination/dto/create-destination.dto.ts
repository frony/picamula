import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

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
    example: '2024-03-15T10:30:00Z',
    description: 'Arrival date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  arrivalDate?: Date;

  @ApiProperty({
    example: '2024-03-15T10:30:00Z',
    description: 'Departure date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  departureDate?: Date;

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
