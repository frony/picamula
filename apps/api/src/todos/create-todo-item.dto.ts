import { IsString, MaxLength, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTodoItemDto {
  @ApiProperty({
    description: 'Title of the TODO item',
    example: 'Book flight tickets',
  })
  @IsString()
  @MaxLength(255)
  title: string;
}

export class CreateBulkTodoItemsDto {
  @ApiProperty({
    description: 'Array of TODO item titles',
    example: ['Book flight tickets', 'Reserve hotel', 'Pack luggage'],
  })
  @IsArray()
  @IsString({ each: true })
  titles: string[];
}
