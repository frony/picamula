import {
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
  IsInt,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExpenseType } from '../entities/trip-expense.entity';

export class CreateTripExpenseDto {
  @ApiProperty({ description: 'Date of the expense' })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Type of expense',
    enum: ExpenseType,
  })
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @ApiProperty({ description: 'Expense description/memo' })
  @IsString()
  @MaxLength(255)
  memo: string;

  @ApiProperty({ description: 'Optional comment about the expense', required: false })
  @ValidateIf((o) => o.comment !== null)
  @IsString()
  @MaxLength(500)
  comment?: string | null;

  @ApiProperty({ description: 'Amount of the expense', example: 50.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Trip ID' })
  @IsInt()
  tripId: number;

  @ApiProperty({ description: 'Trip slug' })
  @IsString()
  @IsOptional()
  tripSlug?: string | null;

  @ApiProperty({ description: 'User ID who paid for the expense' })
  @IsInt()
  paidById: number;
}
