import { Injectable, NotFoundException, ForbiddenException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, QueryRunner } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { MediaFile } from './entities/media-file.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Destination } from '../destination/entities/destination.entity';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(MediaFile)
    private mediaFileRepository: Repository<MediaFile>,
    @InjectRepository(Destination)
    private destinationRepository: Repository<Destination>,
  ) { }

  async create(createTripDto: CreateTripDto, ownerId: number): Promise<Trip> {
    const { destinations, ...tripData } = createTripDto;

    try {
      const trip = this.tripsRepository.create({
        ...tripData,
        ownerId,
      } as Partial<Trip>);

      const savedTrip = await this.tripsRepository.save(trip);

      // Add startCity as the first destination (order: 0)
      // If there are additional destinations, set departure date to first destination's arrival date
      // Otherwise, set departure date to same as arrival date (trip start date)
      let startCityDepartureDate: Date = tripData.startDate; // Default to arrival date
      if (destinations && destinations.length > 0 && destinations[0].arrivalDate) {
        startCityDepartureDate = destinations[0].arrivalDate;
      }

      if (tripData.startCity) {
        const startCityDestination = this.destinationRepository.create({
          name: tripData.startCity,
          order: 0,
          arrivalDate: tripData.startDate,
          departureDate: startCityDepartureDate,
          tripId: savedTrip.id,
        } as Partial<Destination>);
        await this.destinationRepository.save(startCityDestination);
      }

      // Add additional destinations with order starting from 1
      if (destinations && destinations.length > 0) {
        for (let i = 0; i < destinations.length; i++) {
          const { ...destinationData } = destinations[i];
          const destinationEntity = this.destinationRepository.create({
            ...destinationData,
            order: destinationData.order ?? i + 1,
            tripId: savedTrip.id,
          } as Partial<Destination>);
          await this.destinationRepository.save(destinationEntity);
        }
      }

      return savedTrip;
    } catch (error) {
      this.logger.error(`Error creating trip for owner ${ownerId}:`, error);
      throw new InternalServerErrorException('Failed to create trip');
    }
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
      relations: ['owner', 'notes', 'notes.author', 'mediaFiles', 'destinations'],
      order: {
        notes: {
          date: 'DESC',
          createdAt: 'DESC'
        },
        destinations: {
          order: 'ASC'
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
      relations: ['owner', 'notes', 'notes.author', 'mediaFiles', 'destinations'],
      order: {
        notes: {
          date: 'DESC',
          createdAt: 'DESC'
        },
        destinations: {
          order: 'ASC'
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

    // Extract mediaFiles from DTO and handle separately
    const { mediaFiles, ...tripData } = updateTripDto;

    // Use transaction to ensure atomicity
    const queryRunner = this.tripsRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update trip basic data
      Object.assign(trip, tripData);
      const updatedTrip = await queryRunner.manager.save(Trip, trip);

      // Handle media files if provided
      if (mediaFiles && mediaFiles.length > 0) {
        await this.processMediaFiles(mediaFiles, trip.id, queryRunner);
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Return trip with media files included
      return await this.tripsRepository.findOne({
        where: { id: trip.id },
        relations: ['owner', 'notes', 'mediaFiles', 'destinations'],
      });
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating trip ${id}:`, error);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async updateBySlug(slug: string, updateTripDto: UpdateTripDto, userId: number): Promise<Trip> {
    const trip = await this.findBySlug(slug, userId);

    // Extract mediaFiles from DTO and handle separately
    const { mediaFiles, ...tripData } = updateTripDto;

    // Use transaction to ensure atomicity
    const queryRunner = this.tripsRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update trip basic data
      Object.assign(trip, tripData);
      const updatedTrip = await queryRunner.manager.save(Trip, trip);

      // Handle media files if provided
      if (mediaFiles && mediaFiles.length > 0) {
        await this.processMediaFiles(mediaFiles, trip.id, queryRunner);
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Return trip with media files included
      return await this.tripsRepository.findOne({
        where: { id: trip.id },
        relations: ['owner', 'notes', 'mediaFiles', 'destinations'],
      });
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating trip ${slug}:`, error);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
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

  /**
   * Process and save media files for a trip
   * Saves metadata to database within a transaction
   */
  private async processMediaFiles(
    mediaFileDtos: any[],
    tripId: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    try {
      for (const mediaDto of mediaFileDtos) {
        // Create MediaFile entity
        const mediaFile = this.mediaFileRepository.create({
          key: mediaDto.key,
          url: mediaDto.url,
          type: mediaDto.type,
          originalName: mediaDto.originalName,
          mimeType: mediaDto.mimeType,
          size: mediaDto.size,
          order: mediaDto.order || 0,
          width: mediaDto.width,
          height: mediaDto.height,
          duration: mediaDto.duration,
          thumbnailKey: mediaDto.thumbnailKey,
          tripId: tripId,
        });

        // Save using the query runner's manager (part of transaction)
        await queryRunner.manager.save(MediaFile, mediaFile);
        this.logger.log(`Media file saved: ${mediaDto.key} for trip ${tripId}`);
      }
    } catch (error) {
      this.logger.error(`Error processing media files for trip ${tripId}:`, error);
      throw error;
    }
  }

}
