import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
  ) {}

  async create(createTripDto: CreateTripDto, ownerId: number): Promise<Trip> {
    const trip = this.tripsRepository.create({
      ...createTripDto,
      ownerId,
    });
    return await this.tripsRepository.save(trip);
  }

  async findAll(userId: number): Promise<Trip[]> {
    return await this.tripsRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Trip> {
    const trip = await this.tripsRepository.findOne({
      where: { id },
      relations: ['owner', 'notes', 'notes.author'],
      order: {
        notes: {
          date: 'DESC',
          createdAt: 'DESC'
        }
      }
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

  async findBySlug(slug: string, userId: number): Promise<Trip> {
    const trip = await this.tripsRepository.findOne({
      where: { slug },
      relations: ['owner', 'notes', 'notes.author'],
      order: {
        notes: {
          date: 'DESC',
          createdAt: 'DESC'
        }
      }
    });

    if (!trip) {
      throw new NotFoundException(`Trip with slug ${slug} not found`);
    }

    // Check if user owns the trip
    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    return trip;
  }

  async update(id: number, updateTripDto: UpdateTripDto, userId: number): Promise<Trip> {
    const trip = await this.findOne(id, userId);
    Object.assign(trip, updateTripDto);
    return await this.tripsRepository.save(trip);
  }

  async updateBySlug(slug: string, updateTripDto: UpdateTripDto, userId: number): Promise<Trip> {
    const trip = await this.findBySlug(slug, userId);
    Object.assign(trip, updateTripDto);
    return await this.tripsRepository.save(trip);
  }

  async remove(id: number, userId: number): Promise<void> {
    const trip = await this.findOne(id, userId);
    await this.tripsRepository.remove(trip);
  }

  async removeBySlug(slug: string, userId: number): Promise<void> {
    const trip = await this.findBySlug(slug, userId);
    await this.tripsRepository.remove(trip);
  }

  async findByStatus(status: string, userId: number): Promise<Trip[]> {
    return await this.tripsRepository.find({
      where: { ownerId: userId, status: status as any },
      order: { createdAt: 'DESC' },
    });
  }

  async findUpcoming(userId: number): Promise<Trip[]> {
    return await this.tripsRepository.find({
      where: { 
        ownerId: userId,
        startDate: MoreThan(new Date())
      },
      order: { startDate: 'ASC' }
    });
  }

}
