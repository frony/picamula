import { Injectable, NotFoundException, ForbiddenException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, QueryRunner } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { MediaFile } from './entities/media-file.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Destination } from '../destination/entities/destination.entity';
import { GeocodingService } from '../geocoding/geocoding.service';

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
    private geocodingService: GeocodingService,
  ) { }

  async create(createTripDto: CreateTripDto, ownerId: number): Promise<Trip> {
    const { destinations, startCityLatitude, startCityLongitude, ...tripData } = createTripDto;

    try {
      const trip = this.tripsRepository.create({
        ...tripData,
        ownerId,
      } as Partial<Trip>);

      const savedTrip = await this.tripsRepository.save(trip);

      // Add startCity as the first destination (order: 0)
      // If there are additional destinations, set departure date to first destination's arrival date
      // Otherwise, set departure date to same as arrival date (trip start date)
      // Convert dates to YYYY-MM-DD strings
      const tripStartDateStr = tripData.startDate instanceof Date
        ? tripData.startDate.toISOString().split('T')[0]
        : String(tripData.startDate).split('T')[0];

      let startCityDepartureDate: string = tripStartDateStr; // Default to arrival date
      if (destinations && destinations.length > 0 && destinations[0].arrivalDate) {
        startCityDepartureDate = destinations[0].arrivalDate.split('T')[0];
      }

      if (tripData.startCity) {
        // Use coordinates from frontend if provided, otherwise geocode
        let latitude = startCityLatitude;
        let longitude = startCityLongitude;

        if (latitude === undefined || longitude === undefined) {
          // No coordinates from frontend, geocode on backend
          const geocodeResult = await this.geocodingService.geocode(tripData.startCity);
          if (geocodeResult) {
            latitude = geocodeResult.latitude;
            longitude = geocodeResult.longitude;
            this.logger.log(`Geocoded start city "${tripData.startCity}" to ${latitude}, ${longitude}`);
          } else {
            this.logger.warn(`Failed to geocode start city "${tripData.startCity}", using default coordinates`);
            latitude = 0;
            longitude = 0;
          }
        } else {
          this.logger.log(`Using frontend coordinates for start city "${tripData.startCity}": ${latitude}, ${longitude}`);
        }

        const existingStartDestination = await this.destinationRepository.findOne({
          where: { tripId: savedTrip.id, order: 0 },
        });

        if (existingStartDestination) {
          // Update existing
          existingStartDestination.name = tripData.startCity;
          existingStartDestination.latitude = latitude;
          existingStartDestination.longitude = longitude;
          await this.destinationRepository.save(existingStartDestination);
        } else {
          // Create new
          const startCityDestination = this.destinationRepository.create({
            name: tripData.startCity,
            order: 0,
            arrivalDate: tripStartDateStr,
            departureDate: startCityDepartureDate,
            latitude,
            longitude,
            tripId: savedTrip.id,
          } as Partial<Destination>);
          await this.destinationRepository.save(startCityDestination);
        }
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

    // Extract mediaFiles and coordinates from DTO and handle separately
    const { mediaFiles, startCityLatitude, startCityLongitude, ...tripData } = updateTripDto;

    // Use transaction to ensure atomicity
    const queryRunner = this.tripsRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update trip basic data first
      Object.assign(trip, tripData);
      const updatedTrip = await queryRunner.manager.save(Trip, trip);

      // Always sync destination order 0 with the trip's startCity (self-healing)
      // This ensures any existing mismatches are fixed when the trip is saved
      if (updatedTrip.startCity) {
        await this.syncStartCityToDestination(
          updatedTrip.id,
          updatedTrip.startCity,
          updatedTrip.startDate,
          startCityLatitude,
          startCityLongitude,
          queryRunner,
        );
      }

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

    // Extract mediaFiles and coordinates from DTO and handle separately
    const { mediaFiles, startCityLatitude, startCityLongitude, ...tripData } = updateTripDto;

    // Use transaction to ensure atomicity
    const queryRunner = this.tripsRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update trip basic data first
      Object.assign(trip, tripData);
      const updatedTrip = await queryRunner.manager.save(Trip, trip);

      // Always sync destination order 0 with the trip's startCity (self-healing)
      // This ensures any existing mismatches are fixed when the trip is saved
      if (updatedTrip.startCity) {
        await this.syncStartCityToDestination(
          updatedTrip.id,
          updatedTrip.startCity,
          updatedTrip.startDate,
          startCityLatitude,
          startCityLongitude,
          queryRunner,
        );
      }

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

  /**
   * Sync the startCity and startDate fields from trips table to the destination with order 0.
   * The trips table is the source of truth - destination order 0 must always match it.
   * 
   * Coordinates can be provided by the frontend (geocoded via Google Maps API on the client).
   * If coordinates are not provided, existing coordinates are preserved for existing destinations,
   * or geocoding is performed for new destinations.
   * 
   * @param tripId - The trip ID
   * @param startCity - The start city name from trips table (source of truth)
   * @param startDate - The start date from trips table
   * @param latitude - Latitude from frontend (optional)
   * @param longitude - Longitude from frontend (optional)
   * @param queryRunner - The query runner for transaction
   */
  private async syncStartCityToDestination(
    tripId: number,
    startCity: string,
    startDate: Date,
    latitude: number | undefined,
    longitude: number | undefined,
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Convert date to YYYY-MM-DD string
    const startDateStr = startDate instanceof Date
      ? startDate.toISOString().split('T')[0]
      : String(startDate).split('T')[0];

    // Find existing destination with order 0 for this trip
    const existingStartDestination = await queryRunner.manager.findOne(Destination, {
      where: { tripId, order: 0 },
    });

    if (existingStartDestination) {
      // Check if anything needs to be updated
      const nameChanged = existingStartDestination.name !== startCity;
      const dateChanged = existingStartDestination.arrivalDate !== startDateStr;
      const coordsProvided = latitude !== undefined && longitude !== undefined;
      const coordsChanged = coordsProvided && (
        existingStartDestination.latitude !== latitude ||
        existingStartDestination.longitude !== longitude
      );

      // Skip update if nothing changed
      if (!nameChanged && !dateChanged && !coordsChanged) {
        this.logger.debug(`Destination order 0 for trip ${tripId} is already in sync, skipping update`);
        return;
      }

      // Update name and date
      existingStartDestination.name = startCity;
      existingStartDestination.arrivalDate = startDateStr;

      // Handle coordinates
      if (coordsProvided) {
        // Use coordinates from frontend
        existingStartDestination.latitude = latitude;
        existingStartDestination.longitude = longitude;
        this.logger.log(`Updated coordinates for "${startCity}" to ${latitude}, ${longitude} (from frontend)`);
      } else if (nameChanged) {
        // Name changed but no coordinates provided - geocode
        const geocodeResult = await this.geocodingService.geocode(startCity);
        if (geocodeResult) {
          existingStartDestination.latitude = geocodeResult.latitude;
          existingStartDestination.longitude = geocodeResult.longitude;
          this.logger.log(`Geocoded "${startCity}" to ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
        } else {
          this.logger.warn(`Failed to geocode "${startCity}", preserving existing coordinates`);
        }
      }
      // If name didn't change and no coords provided, preserve existing coordinates

      await queryRunner.manager.save(Destination, existingStartDestination);
      this.logger.log(`Synced destination order 0 (id: ${existingStartDestination.id}) with trips.startCity "${startCity}"`);
    } else {
      // No destination order 0 exists - create one
      this.logger.log(`Creating destination order 0 for trip ${tripId} with startCity "${startCity}"`);

      // Determine coordinates
      let finalLatitude = latitude ?? 0;
      let finalLongitude = longitude ?? 0;

      // If no coordinates provided, geocode
      if (latitude === undefined || longitude === undefined) {
        const geocodeResult = await this.geocodingService.geocode(startCity);
        if (geocodeResult) {
          finalLatitude = geocodeResult.latitude;
          finalLongitude = geocodeResult.longitude;
          this.logger.log(`Geocoded "${startCity}" to ${finalLatitude}, ${finalLongitude}`);
        } else {
          this.logger.warn(`Failed to geocode "${startCity}", using coordinates (0, 0)`);
        }
      }

      const newDestination = queryRunner.manager.create(Destination, {
        name: startCity,
        order: 0,
        arrivalDate: startDateStr,
        departureDate: startDateStr,
        latitude: finalLatitude,
        longitude: finalLongitude,
        tripId,
      });
      await queryRunner.manager.save(Destination, newDestination);
      this.logger.log(`Created destination order 0 for trip ${tripId}`);
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
