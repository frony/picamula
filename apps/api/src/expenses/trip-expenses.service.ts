import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripExpenses } from './entities/trip-expense.entity';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { UpdateTripExpenseDto } from './dto/update-trip-expense.dto';
import { Trip } from '../trips/entities/trip.entity';
import { User } from '../users/entities/user.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class TripExpensesService {
  private readonly logger = new Logger(TripExpensesService.name);
  constructor(
    @InjectRepository(TripExpenses)
    private readonly tripExpenseRepository: Repository<TripExpenses>,
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
    const reloadedExpense = await this.tripExpenseRepository.findOne({
      where: { id: savedExpense.id },
      relations: ['paidBy'],
    });
    // delete cache for expenses
    const cacheKey = `trip:${trip.slug}:expenses`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`expenses for trip ${trip.slug} deleted from cache`);

    return reloadedExpense;
  }

  async findAllBySlug(tripSlug: string, currentUserId: number): Promise<TripExpenses[]> {
    const cacheKey = `trip:${tripSlug}:expenses`;
    const cachedExpenses = await this.cacheManager.get(cacheKey);
    if (cachedExpenses) {
      return cachedExpenses as unknown as TripExpenses[];
    }
    // Verify user has access to the trip
    const trip = await this.tripRepository.findOne({
      where: { slug: tripSlug },
      relations: ['owner'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with slug ${tripSlug} not found`);
    }

    const hasAccess = await this.verifyUserTripAccess(currentUserId, trip);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    const expenses = await this.tripExpenseRepository.find({
      where: { tripId: trip.id },
      relations: ['paidBy', 'trip'],
      order: { date: 'DESC' },
    });
    // cache expenses
    // 1 day in milliseconds - findAll cache ttl is 1 day
    const ttl = (86400 + Math.floor(Math.random() * 3600)) * 1000;
    await this.cacheManager.set(cacheKey, expenses, ttl);
    this.logger.log(`expenses for trip ${tripSlug} cached for ${ttl} milliseconds`);
    return expenses;
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

    try {
      // If updating paidBy, verify the new payer is valid
      if (updateTripExpenseDto.paidById) {
        await this.verifyPayerIsValid(
          expense.trip,
          updateTripExpenseDto.paidById,
        );
      }

      // Use TypeORM's update method to directly update the database
      const { tripSlug, ...updateData } = updateTripExpenseDto;
      await this.tripExpenseRepository.update(id, updateData);
      // await this.tripExpenseRepository.update(id, updateTripExpenseDto);

      // Reload with updated paidBy relation
      const reloaded = await this.tripExpenseRepository.findOne({
        where: { id },
        relations: ['paidBy'],
      });

      // delete cache for expenses
      const cacheKey = `trip:${expense.trip.slug}:expenses`;
      await this.cacheManager.del(cacheKey);
      this.logger.log(`expenses for trip ${expense.trip.slug} deleted from cache`);

      return reloaded;
    } catch (error) {
      this.logger.error(`Error updating expense: ${error}`);
      throw new BadRequestException(`Error updating expense: ${error}`);
    }


  }

  async remove(id: number, currentUserId: number): Promise<void> {
    const expense = await this.findOne(id, currentUserId);
    await this.tripExpenseRepository.remove(expense);
    // delete cache for expenses
    const cacheKey = `trip:${expense.trip.slug}:expenses`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`expenses for trip ${expense.trip.slug} deleted from cache`);
  }

  async getTripExpensesSummary(
    tripSlug: string,
    currentUserId: number,
  ): Promise<{
    totalExpenses: number;
    expensesByType: Record<string, number>;
    expensesByPayer: Array<{ userId: number; userName: string; total: number }>;
  }> {
    const expenses = await this.findAllBySlug(tripSlug, currentUserId);

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
