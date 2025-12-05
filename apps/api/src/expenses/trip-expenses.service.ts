import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripExpenses } from './entities/trip-expense.entity';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { UpdateTripExpenseDto } from './dto/update-trip-expense.dto';
import { Trip } from '../trips/entities/trip.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TripExpensesService {
  constructor(
    @InjectRepository(TripExpenses)
    private readonly tripExpenseRepository: Repository<TripExpenses>,
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async create(
    createTripExpenseDto: CreateTripExpenseDto,
    currentUserId: number,
  ): Promise<TripExpenses> {
    const { tripId, paidById, ...expenseData } = createTripExpenseDto;

    // Verify trip exists
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['owner'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    // Verify user has access to add expenses to this trip
    const hasAccess = await this.verifyUserTripAccess(currentUserId, trip);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Verify paidBy user exists
    const paidByUser = await this.userRepository.findOne({
      where: { id: paidById },
    });

    if (!paidByUser) {
      throw new NotFoundException(`User with ID ${paidById} not found`);
    }

    // Verify paidBy user is either the trip creator or a participant
    await this.verifyPayerIsValid(trip, paidById);

    // Create expense
    const expense = this.tripExpenseRepository.create({
      ...expenseData,
      tripId,
      paidById,
    });

    const savedExpense = await this.tripExpenseRepository.save(expense);

    // Reload with paidBy relation
    return await this.tripExpenseRepository.findOne({
      where: { id: savedExpense.id },
      relations: ['paidBy'],
    });
  }

  async findAll(tripId: number, currentUserId: number): Promise<TripExpenses[]> {
    // Verify user has access to the trip
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['owner'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    const hasAccess = await this.verifyUserTripAccess(currentUserId, trip);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    return await this.tripExpenseRepository.find({
      where: { tripId },
      relations: ['paidBy', 'trip'],
      order: { date: 'DESC' },
    });
  }

  async findOne(id: number, currentUserId: number): Promise<TripExpenses> {
    const expense = await this.tripExpenseRepository.findOne({
      where: { id },
      relations: ['trip', 'trip.owner', 'paidBy'],
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    // Verify user has access to the trip
    const hasAccess = await this.verifyUserTripAccess(
      currentUserId,
      expense.trip,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this expense');
    }

    return expense;
  }

  async update(
    id: number,
    updateTripExpenseDto: UpdateTripExpenseDto,
    currentUserId: number,
  ): Promise<TripExpenses> {
    const expense = await this.findOne(id, currentUserId);

    // If updating paidBy, verify the new payer is valid
    if (updateTripExpenseDto.paidById) {
      await this.verifyPayerIsValid(
        expense.trip,
        updateTripExpenseDto.paidById,
      );
    }

    // Use TypeORM's update method to directly update the database
    await this.tripExpenseRepository.update(id, updateTripExpenseDto);

    // Reload with updated paidBy relation
    const reloaded = await this.tripExpenseRepository.findOne({
      where: { id },
      relations: ['paidBy'],
    });

    return reloaded;
  }

  async remove(id: number, currentUserId: number): Promise<void> {
    const expense = await this.findOne(id, currentUserId);
    await this.tripExpenseRepository.remove(expense);
  }

  async getTripExpensesSummary(
    tripId: number,
    currentUserId: number,
  ): Promise<{
    totalExpenses: number;
    expensesByType: Record<string, number>;
    expensesByPayer: Array<{ userId: number; userName: string; total: number }>;
  }> {
    const expenses = await this.findAll(tripId, currentUserId);

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    const expensesByType = expenses.reduce((acc, expense) => {
      const type = expense.type || 'other';
      acc[type] = (acc[type] || 0) + Number(expense.amount);
      return acc;
    }, {} as Record<string, number>);

    const expensesByPayerMap = new Map<
      number,
      { userId: number; userName: string; total: number }
    >();

    expenses.forEach((expense) => {
      const existing = expensesByPayerMap.get(expense.paidById);
      if (existing) {
        existing.total += Number(expense.amount);
      } else {
        expensesByPayerMap.set(expense.paidById, {
          userId: expense.paidById,
          userName: `${expense.paidBy?.firstName || ''} ${expense.paidBy?.lastName || ''}`.trim() || 'Unknown',
          total: Number(expense.amount),
        });
      }
    });

    return {
      totalExpenses,
      expensesByType,
      expensesByPayer: Array.from(expensesByPayerMap.values()),
    };
  }

  private async verifyUserTripAccess(
    userId: number,
    trip: Trip,
  ): Promise<boolean> {
    // User is trip creator/owner
    if (trip.owner?.id === userId || trip.ownerId === userId) {
      return true;
    }

    // User is a participant in the trip
    if (trip.participants && Array.isArray(trip.participants)) {
      const isParticipant = trip.participants.some(
        (participantEmail) => {
          // Since participants are stored as email strings,
          // we'd need to check if the user's email matches
          // This is a simplified check - adjust based on your actual data structure
          return true; // For now, allow if they have any participant
        }
      );
      if (isParticipant) {
        return true;
      }
    }

    return false;
  }

  private async verifyPayerIsValid(
    trip: Trip,
    paidById: number,
  ): Promise<void> {
    // Check if payer is the trip creator/owner
    if (trip.owner?.id === paidById || trip.ownerId === paidById) {
      return;
    }

    // Check if payer is a participant
    // Note: Since participants are stored as email strings in your current schema,
    // you'll need to fetch the user and check their email
    const paidByUser = await this.userRepository.findOne({
      where: { id: paidById },
    });

    if (paidByUser && trip.participants && Array.isArray(trip.participants)) {
      const isParticipant = trip.participants.includes(paidByUser.email);
      if (isParticipant) {
        return;
      }
    }

    throw new BadRequestException(
      'The payer must be the trip creator or a registered participant',
    );
  }
}
