import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
  ) {}

  async create(createTripDto: CreateTripDto, ownerId: string): Promise<Trip> {
    const trip = this.tripsRepository.create({
      ...createTripDto,
      ownerId,
    });
    return await this.tripsRepository.save(trip);
  }

  async findAll(userId: string): Promise<Trip[]> {
    return await this.tripsRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Trip> {
    const trip = await this.tripsRepository.findOne({
      where: { id },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    // Check if user owns the trip
    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    return trip;
  }

  async update(id: string, updateTripDto: UpdateTripDto, userId: string): Promise<Trip> {
    const trip = await this.findOne(id, userId);
    Object.assign(trip, updateTripDto);
    return await this.tripsRepository.save(trip);
  }

  async remove(id: string, userId: string): Promise<void> {
    const trip = await this.findOne(id, userId);
    await this.tripsRepository.remove(trip);
  }

  async findByStatus(status: string, userId: string): Promise<Trip[]> {
    return await this.tripsRepository.find({
      where: { ownerId: userId, status: status as any },
      order: { createdAt: 'DESC' },
    });
  }

  async findUpcoming(userId: string): Promise<Trip[]> {
    return await this.tripsRepository
      .createQueryBuilder('trip')
      .where('trip.ownerId = :userId', { userId })
      .andWhere('trip.startDate > :now', { now: new Date() })
      .orderBy('trip.startDate', 'ASC')
      .getMany();
  }
}
