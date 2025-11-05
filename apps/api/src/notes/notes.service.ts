import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { Trip } from '../trips/entities/trip.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
  ) {}

  async create(tripSlug: string, createNoteDto: CreateNoteDto, authorId: number): Promise<Note> {
    // Find trip by slug and verify user has access
    const trip = await this.tripsRepository.findOne({
      where: { slug: tripSlug, ownerId: authorId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with slug ${tripSlug} not found or you do not have access to it`);
    }

    const note = this.notesRepository.create({
      ...createNoteDto,
      date: new Date(createNoteDto.date),
      tripId: trip.id,  // Use numeric ID
      authorId,
    });

    return await this.notesRepository.save(note);
  }

  async findAllByTrip(tripSlug: string, userId: number): Promise<Note[]> {
    // Find trip by slug and verify user has access
    const trip = await this.tripsRepository.findOne({
      where: { slug: tripSlug, ownerId: userId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with slug ${tripSlug} not found or you do not have access to it`);
    }

    return await this.notesRepository.find({
      where: { tripId: trip.id },  // Use numeric ID
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: number): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { 
        id,
        trip: { ownerId: userId }
      },
      relations: ['trip'],
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found or you do not have access to it`);
    }

    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto, userId: number): Promise<Note> {
    const note = await this.findOne(id, userId);

    // Update the note
    Object.assign(note, {
      ...updateNoteDto,
      ...(updateNoteDto.date && { date: new Date(updateNoteDto.date) }),
    });

    return await this.notesRepository.save(note);
  }

  async remove(id: string, userId: number): Promise<void> {
    const note = await this.findOne(id, userId);
    await this.notesRepository.remove(note);
  }
}
