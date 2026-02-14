import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Destination } from '../destination/entities/destination.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Destination)
    private destinationRepository: Repository<Destination>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

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
      // Compare as YYYY-MM-DD strings to avoid timezone issues.
      // Destination dates are already stored as YYYY-MM-DD strings (via dateTransformer).
      // Note date is extracted as UTC to match.
      const noteDateStr = noteDate.toISOString().split('T')[0];
      const arrivalStr = String(destination.arrivalDate).split('T')[0];
      const departureStr = String(destination.departureDate).split('T')[0];

      if (noteDateStr < arrivalStr || noteDateStr > departureStr) {
        const formatDateStr = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
          });
        };
        throw new BadRequestException(
          `Note date must be within the destination's arrival and departure dates (${formatDateStr(arrivalStr)} - ${formatDateStr(departureStr)})`
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

    await this.notesRepository.save(note);
    // Re-fetch to load eager relations (author) - save() doesn't return them
    const savedNote = await this.notesRepository.findOne({
      where: { id: note.id },
    });

    if (!savedNote) {
      throw new NotFoundException('Failed to retrieve saved note');
    }

    const cacheKey = `trip:${trip.slug}`;
    await this.cacheManager.del(cacheKey);

    return savedNote;
  }

  async findAllByTrip(tripSlug: string, userId: number): Promise<Note[]> {
    // Find trip by slug and verify user has access
    const trip = await this.tripsRepository.findOne({
      where: { slug: tripSlug, ownerId: userId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with slug ${tripSlug} not found or you do not have access to it`);
    }

    const notes = await this.notesRepository.find({
      where: { tripId: trip.id },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    return notes;
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

    await this.notesRepository.save(note);
    // Re-fetch to load eager relations (author) - save() doesn't return them
    const updatedNote = await this.notesRepository.findOne({
      where: { id: note.id },
    });

    if (!updatedNote) {
      throw new NotFoundException('Failed to retrieve updated note');
    }

    const cacheKey = `trip:${note.trip.slug}`;
    await this.cacheManager.del(cacheKey);

    return updatedNote;
  }

  async remove(id: string, userId: number): Promise<void> {
    const note = await this.findOne(id, userId);
    await this.notesRepository.remove(note);
    const cacheKey = `trip:${note.trip.slug}`;
    await this.cacheManager.del(cacheKey);
  }
}