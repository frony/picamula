import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destination.entity';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { Trip } from '../trips/entities/trip.entity';

@Injectable()
export class DestinationService {
  constructor(
    @InjectRepository(Destination)
    private destinationRepository: Repository<Destination>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
  ) {}

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

    // Set default arrival and departure dates based on previous destination's departure date
    let arrivalDate = createDestinationDto.arrivalDate;
    let departureDate = createDestinationDto.departureDate;

    if (!arrivalDate && previousDestination?.departureDate) {
      arrivalDate = previousDestination.departureDate;
    }
    if (!departureDate && arrivalDate) {
      departureDate = arrivalDate;
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

    const destination = this.destinationRepository.create({
      ...createDestinationDto,
      arrivalDate,
      departureDate,
      order: createDestinationDto.order ?? maxOrder + 1,
      tripId,
    });

    return await this.destinationRepository.save(destination);
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

    return await this.destinationRepository.find({
      where: { tripId },
      order: { order: 'ASC' },
    });
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

    // Validate dates are within trip date range
    const tripStartDate = new Date(trip.startDate);
    const tripEndDate = new Date(trip.endDate);

    if (updateData.arrivalDate) {
      const arrivalDate = new Date(updateData.arrivalDate);
      if (arrivalDate < tripStartDate || arrivalDate > tripEndDate) {
        throw new BadRequestException('Arrival date must be within the trip date range');
      }
    }

    if (updateData.departureDate) {
      const departureDate = new Date(updateData.departureDate);
      if (departureDate < tripStartDate || departureDate > tripEndDate) {
        throw new BadRequestException('Departure date must be within the trip date range');
      }
    }

    // Validate departure date is not before arrival date
    const newArrivalDate = updateData.arrivalDate ? new Date(updateData.arrivalDate) : (destination.arrivalDate ? new Date(destination.arrivalDate) : null);
    const newDepartureDate = updateData.departureDate ? new Date(updateData.departureDate) : (destination.departureDate ? new Date(destination.departureDate) : null);

    if (newArrivalDate && newDepartureDate && newDepartureDate < newArrivalDate) {
      throw new BadRequestException('Departure date cannot be before arrival date');
    }

    // If this is the first destination (order 1) and arrivalDate is being updated,
    // also update the start city's (order 0) departure date
    if (destination.order === 1 && updateData.arrivalDate !== undefined) {
      const startCity = trip.destinations?.find(d => d.order === 0);
      if (startCity) {
        startCity.departureDate = updateData.arrivalDate;
        await this.destinationRepository.save(startCity);
      }
    }

    Object.assign(destination, updateData);
    return await this.destinationRepository.save(destination);
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

    // Swap orders
    const tempOrder = sourceDestination.order;
    sourceDestination.order = targetDestination.order;
    targetDestination.order = tempOrder;

    // Swap arrival and departure dates
    const tempArrivalDate = sourceDestination.arrivalDate;
    const tempDepartureDate = sourceDestination.departureDate;
    sourceDestination.arrivalDate = targetDestination.arrivalDate;
    sourceDestination.departureDate = targetDestination.departureDate;
    targetDestination.arrivalDate = tempArrivalDate;
    targetDestination.departureDate = tempDepartureDate;

    // Save both destinations
    await this.destinationRepository.save(sourceDestination);
    await this.destinationRepository.save(targetDestination);

    // Return all destinations sorted by order
    return await this.destinationRepository.find({
      where: { tripId },
      order: { order: 'ASC' },
    });
  }
}
