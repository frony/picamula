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

  async findOne(id: string, userId: number): Promise<Trip> {
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

  async update(id: string, updateTripDto: UpdateTripDto, userId: number): Promise<Trip> {
    const trip = await this.findOne(id, userId);
    Object.assign(trip, updateTripDto);
    return await this.tripsRepository.save(trip);
  }

  async remove(id: string, userId: number): Promise<void> {
    const trip = await this.findOne(id, userId);
    await this.tripsRepository.remove(trip);
  }

  async findByStatus(status: string, userId: number): Promise<Trip[]> {
    return await this.tripsRepository.find({
      where: { ownerId: userId, status: status as any },
      order: { createdAt: 'DESC' },
    });
  }

  async findUpcoming(userId: number): Promise<Trip[]> {
    return await this.tripsRepository
      .createQueryBuilder('trip')
      .where('trip.ownerId = :userId', { userId })
      .andWhere('trip.startDate > :now', { now: new Date() })
      .orderBy('trip.startDate', 'ASC')
      .getMany();
  }

  async addNote(id: string, noteData: { content: string; date: string }, userId: number): Promise<Trip> {
    const trip = await this.findOne(id, userId);
    
    // Initialize notes array if it doesn't exist
    if (!trip.notes) {
      trip.notes = [];
    }
    
    // Add the new note
    trip.notes.push(noteData);
    
    return await this.tripsRepository.save(trip);
  }

  async updateNote(id: string, noteIndex: number, noteData: { content: string; date: string }, userId: number): Promise<Trip> {
    const trip = await this.findOne(id, userId);
    
    // Check if notes array exists and note index is valid
    if (!trip.notes || noteIndex < 0 || noteIndex >= trip.notes.length) {
      throw new NotFoundException(`Note at index ${noteIndex} not found`);
    }
    
    // Update the note at the specified index
    trip.notes[noteIndex] = noteData;
    
    return await this.tripsRepository.save(trip);
  }
}
