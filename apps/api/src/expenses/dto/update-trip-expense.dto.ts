import { PartialType } from '@nestjs/swagger';
import { CreateTripExpenseDto } from './create-trip-expense.dto';

export class UpdateTripExpenseDto extends PartialType(CreateTripExpenseDto) {}
