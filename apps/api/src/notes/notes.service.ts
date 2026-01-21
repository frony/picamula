import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Destination } from '../destination/entities/destination.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Destination)
    private destinationRepository: Repository<Destination>,
  ) {}

  private async validateNoteDateWithinDestination(
    noteDate: Date,
    destinationId: number,
    tripId: number,
  ): Promise<void> {
    const destination = await this.destinationRepository.findOne({
      where: { id: destinationId, tripId },
    });

    if (!destination) {
      throw new BadRequestException(`Destination with ID ${destinationId} not found in this trip`);
    }

    // Only validate if the destination has both arrival and departure dates
    if (destination.arrivalDate && destination.departureDate) {
      const arrivalDate = new Date(destination.arrivalDate);
      const departureDate = new Date(destination.departureDate);
      
      // Normalize dates to compare only date parts (ignore time) using UTC to avoid timezone issues
      const noteDateOnly = Date.UTC(noteDate.getUTCFullYear(), noteDate.getUTCMonth(), noteDate.getUTCDate());
      const arrivalDateOnly = Date.UTC(arrivalDate.getUTCFullYear(), arrivalDate.getUTCMonth(), arrivalDate.getUTCDate());
      const departureDateOnly = Date.UTC(departureDate.getUTCFullYear(), departureDate.getUTCMonth(), departureDate.getUTCDate());

      if (noteDateOnly < arrivalDateOnly || noteDateOnly > departureDateOnly) {
        // Format dates in UTC to avoid timezone conversion
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          timeZone: 'UTC'
        });
        throw new BadRequestException(
          `Note date must be within the destination dates (${formatDate(arrivalDate)} - ${formatDate(departureDate)})`
        );
      }
    }
  }

  async create(tripSlug: string, createNoteDto: CreateNoteDto, authorId: number): Promise<Note> {
    // Find trip by slug and verify user has access
    const trip = await this.tripsRepository.findOne({
      where: { slug: tripSlug, ownerId: authorId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with slug ${tripSlug} not found or you do not have access to it`);
    }

    const noteDate = new Date(createNoteDto.date);

    // Validate note date is within destination dates if a destination is specified
    if (createNoteDto.destinationId) {
      await this.validateNoteDateWithinDestination(noteDate, createNoteDto.destinationId, trip.id);
    }

    const note = this.notesRepository.create({
      content: createNoteDto.content,
      date: noteDate,
      tripId: trip.id,
      authorId,
      destinationId: createNoteDto.destinationId || null,
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
      where: { tripId: trip.id },
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

    // Determine the final date and destinationId for validation
    const finalDate = updateNoteDto.date !== undefined 
      ? new Date(updateNoteDto.date) 
      : note.date;
    
    const finalDestinationId = 'destinationId' in updateNoteDto 
      ? updateNoteDto.destinationId 
      : note.destinationId;

    // Validate note date is within destination dates if a destination is specified
    if (finalDestinationId) {
      await this.validateNoteDateWithinDestination(finalDate, finalDestinationId, note.tripId);
    }

    // Update the note
    if (updateNoteDto.content !== undefined) {
      note.content = updateNoteDto.content;
    }
    if (updateNoteDto.date !== undefined) {
      note.date = new Date(updateNoteDto.date);
    }
    // Handle destinationId - allow setting to null to remove destination
    if ('destinationId' in updateNoteDto) {
      note.destinationId = updateNoteDto.destinationId ?? null;
    }

    return await this.notesRepository.save(note);
  }

  async remove(id: string, userId: number): Promise<void> {
    const note = await this.findOne(id, userId);
    await this.notesRepository.remove(note);
  }
}
