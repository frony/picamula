import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destination.entity';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { Trip } from '../trips/entities/trip.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class DestinationService {
  private readonly logger = new Logger(DestinationService.name);

  constructor(
    @InjectRepository(Destination)
    private destinationRepository: Repository<Destination>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    private geocodingService: GeocodingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async create(tripId: number, createDestinationDto: CreateDestinationDto, userId: number): Promise<Destination> {
    // Verify trip exists and user owns it
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['destinations'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Sort destinations by order
    const sortedDestinations = (trip.destinations || []).sort((a, b) => a.order - b.order);

    // Get the current max order for destinations in this trip
    const maxOrder = sortedDestinations.length > 0
      ? sortedDestinations[sortedDestinations.length - 1].order
      : -1;

    // Get the previous destination (the one with the current max order)
    const previousDestination = sortedDestinations.find(d => d.order === maxOrder);

    // Set default arrival and departure dates
    let arrivalDate = createDestinationDto.arrivalDate;
    let departureDate = createDestinationDto.departureDate;

    // If no arrivalDate provided, use previous destination's departureDate
    if (!arrivalDate && previousDestination?.departureDate) {
      arrivalDate = previousDestination.departureDate;
    }

    // If no departureDate provided, use the trip's end date as fallback
    // (new destinations are appended at the end, so there's no next destination)
    if (!departureDate) {
      const tripEndDateStr = trip.endDate instanceof Date
        ? trip.endDate.toISOString().split('T')[0]
        : String(trip.endDate).split('T')[0];
      departureDate = tripEndDateStr;
    }

    // If this is the first additional destination (order would be 1),
    // update the start city's (order 0) departure date
    if (maxOrder === 0 && arrivalDate) {
      const startCity = sortedDestinations.find(d => d.order === 0);
      if (startCity) {
        startCity.departureDate = arrivalDate;
        await this.destinationRepository.save(startCity);
      }
    }

    // Get coordinates - use provided ones or geocode
    let latitude = createDestinationDto.latitude;
    let longitude = createDestinationDto.longitude;

    // If coordinates not provided or are 0, geocode the destination name
    if ((latitude === undefined || latitude === 0) && (longitude === undefined || longitude === 0)) {
      this.logger.log(`Geocoding destination "${createDestinationDto.name}"`);
      const geocodeResult = await this.geocodingService.geocode(createDestinationDto.name);
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        this.logger.log(`Geocoded "${createDestinationDto.name}" to ${latitude}, ${longitude}`);
      } else {
        this.logger.warn(`Failed to geocode "${createDestinationDto.name}", using coordinates (0, 0)`);
        latitude = 0;
        longitude = 0;
      }
    }

    const destination = this.destinationRepository.create({
      ...createDestinationDto,
      arrivalDate,
      departureDate,
      latitude,
      longitude,
      order: createDestinationDto.order ?? maxOrder + 1,
      tripId,
    });

    const result = await this.destinationRepository.save(destination);
    await this.cacheManager.del(`trip:${trip.slug}`);
    return result;
  }

  async findAllByTrip(tripId: number, userId: number): Promise<Destination[]> {
    // Verify trip exists and user owns it
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    const destinations = await this.destinationRepository.find({
      where: { tripId },
      order: { order: 'ASC' },
    });
    return destinations;
  }

  async findAllByTripSlug(tripSlug: string, userId: number): Promise<Destination[]> {
    // Verify trip exists and user owns it
    const trip = await this.tripRepository.findOne({
      where: { slug: tripSlug },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with slug ${tripSlug} not found`);
    }

    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    const destinations = await this.destinationRepository.find({
      where: { tripId: trip.id },
      order: { order: 'ASC' },
    });

    return destinations;
  }

  async update(id: number, tripId: number, updateData: Partial<CreateDestinationDto>, userId: number): Promise<Destination> {
    // Get trip with all destinations for validation
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['destinations'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    const destination = trip.destinations?.find(d => d.id === id);

    if (!destination) {
      throw new NotFoundException(`Destination with ID ${id} not found`);
    }

    // Validate dates are within trip date range - convert Date to string
    const tripStartDate = trip.startDate instanceof Date
      ? trip.startDate.toISOString().split('T')[0]
      : String(trip.startDate).split('T')[0];
    const tripEndDate = trip.endDate instanceof Date
      ? trip.endDate.toISOString().split('T')[0]
      : String(trip.endDate).split('T')[0];

    // Calculate final dates (from update or existing destination) - all as YYYY-MM-DD strings
    const newArrivalDate = updateData.arrivalDate
      ? updateData.arrivalDate.split('T')[0]
      : destination.arrivalDate;
    const newDepartureDate = updateData.departureDate
      ? updateData.departureDate.split('T')[0]
      : destination.departureDate;

    // Validate arrival date is within trip range
    if (newArrivalDate && (newArrivalDate < tripStartDate || newArrivalDate > tripEndDate)) {
      throw new BadRequestException('Arrival date must be within the trip date range');
    }

    // Validate departure date is within trip range
    if (newDepartureDate && (newDepartureDate < tripStartDate || newDepartureDate > tripEndDate)) {
      throw new BadRequestException('Departure date must be within the trip date range');
    }

    // Validate departure date is not before arrival date
    if (newArrivalDate && newDepartureDate && newDepartureDate < newArrivalDate) {
      throw new BadRequestException('Departure date cannot be before arrival date');
    }

    const sortedDestinations = (trip.destinations || []).sort((a, b) => a.order - b.order);

    // If arrivalDate is being updated, cascade to the previous destination's departureDate
    if (updateData.arrivalDate !== undefined && destination.order > 0) {
      const previousDestination = sortedDestinations.find(d => d.order === destination.order - 1);

      if (previousDestination) {
        const newArrival = updateData.arrivalDate.split('T')[0];
        const prevArrival = previousDestination.arrivalDate
          ? String(previousDestination.arrivalDate).split('T')[0]
          : null;

        if (prevArrival && newArrival < prevArrival) {
          throw new BadRequestException(
            `Arrival date cannot be before ${previousDestination.name}'s arrival date (${prevArrival})`
          );
        }

        previousDestination.departureDate = newArrival;
        await this.destinationRepository.save(previousDestination);
      }
    }

    // If departureDate is being updated, cascade to the next destination's arrivalDate
    if (updateData.departureDate !== undefined) {
      const nextDestination = sortedDestinations.find(d => d.order === destination.order + 1);

      if (nextDestination) {
        const newDeparture = updateData.departureDate.split('T')[0];
        const nextDeparture = nextDestination.departureDate
          ? String(nextDestination.departureDate).split('T')[0]
          : null;

        if (nextDeparture && newDeparture > nextDeparture) {
          throw new BadRequestException(
            `Departure date cannot be after ${nextDestination.name}'s departure date (${nextDeparture})`
          );
        }

        nextDestination.arrivalDate = newDeparture;
        await this.destinationRepository.save(nextDestination);
      }
    }

    // Ensure dates are stored as YYYY-MM-DD strings
    if (updateData.arrivalDate) {
      updateData.arrivalDate = updateData.arrivalDate.split('T')[0];
    }
    if (updateData.departureDate) {
      updateData.departureDate = updateData.departureDate.split('T')[0];
    }

    Object.assign(destination, updateData);
    const result = await this.destinationRepository.save(destination);
    await this.cacheManager.del(`trip:${trip.slug}`);
    return result;
  }

  async remove(id: number, tripId: number, userId: number): Promise<void> {
    // Get trip with all destinations
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['destinations'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    const destination = trip.destinations?.find(d => d.id === id);

    if (!destination) {
      throw new NotFoundException(`Destination with ID ${id} not found`);
    }

    // Don't allow removing the start city (order 0)
    if (destination.order === 0) {
      throw new ForbiddenException('Cannot remove the start city');
    }

    // Sort destinations by order
    const sortedDestinations = (trip.destinations || []).sort((a, b) => a.order - b.order);
    const deletedOrder = destination.order;
    const isLastDestination = deletedOrder === sortedDestinations[sortedDestinations.length - 1].order;

    // Find previous and next destinations
    const previousDestination = sortedDestinations.find(d => d.order === deletedOrder - 1);
    const nextDestination = sortedDestinations.find(d => d.order === deletedOrder + 1);

    if (isLastDestination && previousDestination) {
      // If deleting the last item, set previous item's departure date to deleted item's departure date
      if (destination.departureDate) {
        previousDestination.departureDate = destination.departureDate;
        await this.destinationRepository.save(previousDestination);
      }
    } else if (nextDestination && previousDestination) {
      // If deleting a middle item, set next item's arrival date to previous item's departure date
      if (previousDestination.departureDate) {
        nextDestination.arrivalDate = previousDestination.departureDate;
        await this.destinationRepository.save(nextDestination);
      }
    }

    // Remove the destination
    await this.destinationRepository.remove(destination);

    // Reorder remaining destinations
    for (const dest of sortedDestinations) {
      if (dest.order > deletedOrder && dest.id !== id) {
        dest.order = dest.order - 1;
        await this.destinationRepository.save(dest);
      }
    }
    await this.cacheManager.del(`trip:${trip.slug}`);
  }

  async reorder(tripId: number, sourceId: number, targetId: number, userId: number): Promise<Destination[]> {
    // Get trip with all destinations
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['destinations'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    if (trip.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    const sourceDestination = trip.destinations?.find(d => d.id === sourceId);
    const targetDestination = trip.destinations?.find(d => d.id === targetId);

    if (!sourceDestination) {
      throw new NotFoundException(`Source destination with ID ${sourceId} not found`);
    }

    if (!targetDestination) {
      throw new NotFoundException(`Target destination with ID ${targetId} not found`);
    }

    // Don't allow reordering the start city (order 0)
    if (sourceDestination.order === 0 || targetDestination.order === 0) {
      throw new ForbiddenException('Cannot reorder the start city');
    }

    const sourceOrder = sourceDestination.order;
    const targetOrder = targetDestination.order;

    // If source and target are the same, nothing to do
    if (sourceOrder === targetOrder) {
      return await this.destinationRepository.find({
        where: { tripId },
        order: { order: 'ASC' },
      });
    }

    // Sort all destinations by order
    const sortedDestinations = (trip.destinations || []).sort((a, b) => a.order - b.order);

    // Store the original dates by order position (these will stay in place)
    const datesByOrder: Map<number, { arrivalDate: string | null; departureDate: string | null }> = new Map();
    for (const dest of sortedDestinations) {
      datesByOrder.set(dest.order, {
        arrivalDate: dest.arrivalDate,
        departureDate: dest.departureDate,
      });
    }

    // Update order values
    if (sourceOrder > targetOrder) {
      // Moving item UP (e.g., from order 8 to order 4)
      // Source takes target's position, items between shift down by 1
      for (const dest of sortedDestinations) {
        if (dest.id === sourceId) {
          // Source moves to target position
          dest.order = targetOrder;
        } else if (dest.order >= targetOrder && dest.order < sourceOrder) {
          // Items between target and source shift down by 1
          dest.order = dest.order + 1;
        }
      }
    } else {
      // Moving item DOWN (e.g., from order 4 to order 8)
      // Source takes target's position, items between shift up by 1
      for (const dest of sortedDestinations) {
        if (dest.id === sourceId) {
          // Source moves to target position
          dest.order = targetOrder;
        } else if (dest.order > sourceOrder && dest.order <= targetOrder) {
          // Items between source and target shift up by 1
          dest.order = dest.order - 1;
        }
      }
    }

    // Now assign dates based on new order positions (dates stay at their positions)
    for (const dest of sortedDestinations) {
      const datesForPosition = datesByOrder.get(dest.order);
      if (datesForPosition) {
        dest.arrivalDate = datesForPosition.arrivalDate;
        dest.departureDate = datesForPosition.departureDate;
      }
    }

    // Save all affected destinations
    await this.destinationRepository.save(sortedDestinations);
    await this.cacheManager.del(`trip:${trip.slug}`);

    return await this.destinationRepository.find({
      where: { tripId },
      order: { order: 'ASC' },
    });
  }
}
