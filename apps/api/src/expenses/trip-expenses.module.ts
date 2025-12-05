import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripExpensesService } from './trip-expenses.service';
import { TripExpensesController } from './trip-expenses.controller';
import { TripExpenses } from './entities/trip-expense.entity';
import { Trip } from '../trips/entities/trip.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TripExpenses, Trip, User])],
  controllers: [TripExpensesController],
  providers: [TripExpensesService],
  exports: [TripExpensesService],
})
export class TripExpensesModule {}
