import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { Destination } from './entities/destination.entity';
import { Trip } from '../trips/entities/trip.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateDestinationDto } from './dto/create-destination.dto';

describe('DestinationService', () => {
  let service: DestinationService;
  let destinationRepository: jest.Mocked<Repository<Destination>>;
  let tripRepository: jest.Mocked<Repository<Trip>>;
  let geocodingService: jest.Mocked<GeocodingService>;

  // Mock data
  const mockTrip: Partial<Trip> = {
    id: 1,
    title: 'Test Trip',
    slug: 'test-trip',
    startCity: 'New York',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-15'),
    ownerId: 1,
    destinations: [],
  };

  const mockDestination: Partial<Destination> = {
    id: 1,
    name: 'Paris, France',
    order: 1,
    arrivalDate: '2025-06-05',
    departureDate: '2025-06-08',
    latitude: 48.8566,
    longitude: 2.3522,
    tripId: 1,
  };

  const mockStartCityDestination: Partial<Destination> = {
    id: 0,
    name: 'New York',
    order: 0,
    arrivalDate: '2025-06-01',
    departureDate: '2025-06-05',
    latitude: 40.7128,
    longitude: -74.006,
    tripId: 1,
  };

  const mockGeocodingResult = {
    latitude: 48.8566,
    longitude: 2.3522,
    formattedAddress: 'Paris, France',
  };

  beforeEach(async () => {
    const mockDestinationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockTripRepository = {
      findOne: jest.fn(),
    };

    const mockGeocodingService = {
      geocode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DestinationService,
        {
          provide: getRepositoryToken(Destination),
          useValue: mockDestinationRepository,
        },
        {
          provide: getRepositoryToken(Trip),
          useValue: mockTripRepository,
        },
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
      ],
    }).compile();

    service = module.get<DestinationService>(DestinationService);
    destinationRepository = module.get(getRepositoryToken(Destination));
    tripRepository = module.get(getRepositoryToken(Trip));
    geocodingService = module.get(GeocodingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateDestinationDto = {
      name: 'Paris, France',
      arrivalDate: '2025-06-05',
      departureDate: '2025-06-08',
    };

    describe('successful creation', () => {
      it('should create a destination with provided coordinates', async () => {
        const dtoWithCoords: CreateDestinationDto = {
          ...createDto,
          latitude: 48.8566,
          longitude: 2.3522,
        };

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        const result = await service.create(1, dtoWithCoords, 1);

        expect(result).toEqual(mockDestination);
        expect(geocodingService.geocode).not.toHaveBeenCalled();
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Paris, France',
            latitude: 48.8566,
            longitude: 2.3522,
            order: 1,
            tripId: 1,
          })
        );
      });

      it('should geocode destination when coordinates not provided', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, createDto, 1);

        expect(geocodingService.geocode).toHaveBeenCalledWith('Paris, France');
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 48.8566,
            longitude: 2.3522,
          })
        );
      });

      it('should use (0, 0) when geocoding fails', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        geocodingService.geocode.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, createDto, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 0,
            longitude: 0,
          })
        );
      });

      it('should geocode when latitude is 0', async () => {
        const dtoWithZeroLat: CreateDestinationDto = {
          ...createDto,
          latitude: 0,
          longitude: 0,
        };

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, dtoWithZeroLat, 1);

        expect(geocodingService.geocode).toHaveBeenCalledWith('Paris, France');
      });

      it('should set order to maxOrder + 1 when order not provided', async () => {
        const existingDestinations = [
          { ...mockStartCityDestination, order: 0 },
          { ...mockDestination, id: 2, order: 1 },
          { ...mockDestination, id: 3, order: 2 },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: existingDestinations,
        } as Trip);

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, createDto, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 3,
          })
        );
      });

      it('should use provided order when specified', async () => {
        const dtoWithOrder: CreateDestinationDto = {
          ...createDto,
          order: 5,
        };

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, dtoWithOrder, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 5,
          })
        );
      });

      it('should set order to 0 when no existing destinations', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [],
        } as Trip);

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, createDto, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 0,
          })
        );
      });

      it('should inherit arrival date from previous destination departure date', async () => {
        const existingDestinations = [
          { ...mockStartCityDestination, order: 0, departureDate: '2025-06-05' },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: existingDestinations,
        } as Trip);

        const dtoWithoutDates: CreateDestinationDto = {
          name: 'Paris, France',
        };

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, dtoWithoutDates, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            arrivalDate: '2025-06-05',
            departureDate: '2025-06-05',
          })
        );
      });

      it('should set departure date equal to arrival date when only arrival provided', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        const dtoWithArrivalOnly: CreateDestinationDto = {
          name: 'Paris, France',
          arrivalDate: '2025-06-10',
        };

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, dtoWithArrivalOnly, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            arrivalDate: '2025-06-10',
            departureDate: '2025-06-10',
          })
        );
      });

      it('should update start city departure date when creating first additional destination', async () => {
        const startCity = {
          ...mockStartCityDestination,
          id: 1,
          order: 0,
          departureDate: '2025-06-01',
        };

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [startCity],
        } as Trip);

        const dtoWithArrival: CreateDestinationDto = {
          name: 'Paris, France',
          arrivalDate: '2025-06-05',
        };

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, dtoWithArrival, 1);

        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 0,
            departureDate: '2025-06-05',
          })
        );
      });
    });

    describe('validation errors', () => {
      it('should throw NotFoundException when trip does not exist', async () => {
        tripRepository.findOne.mockResolvedValue(null);

        await expect(service.create(999, createDto, 1)).rejects.toThrow(NotFoundException);
        await expect(service.create(999, createDto, 1)).rejects.toThrow('Trip with ID 999 not found');
      });

      it('should throw ForbiddenException when user does not own trip', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          ownerId: 2,
        } as Trip);

        await expect(service.create(1, createDto, 1)).rejects.toThrow(ForbiddenException);
        await expect(service.create(1, createDto, 1)).rejects.toThrow('You do not have access to this trip');
      });
    });

    describe('edge cases', () => {
      it('should handle undefined destinations array', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: undefined,
        } as unknown as Trip);

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, createDto, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 0,
          })
        );
      });

      it('should handle null destinations array', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: null as any,
        } as Trip);

        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        await service.create(1, createDto, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 0,
          })
        );
      });
    });
  });

  describe('findAllByTrip', () => {
    it('should return all destinations for a trip', async () => {
      const destinations = [
        { ...mockStartCityDestination },
        { ...mockDestination },
      ];

      tripRepository.findOne.mockResolvedValue(mockTrip as Trip);
      destinationRepository.find.mockResolvedValue(destinations as Destination[]);

      const result = await service.findAllByTrip(1, 1);

      expect(result).toEqual(destinations);
      expect(destinationRepository.find).toHaveBeenCalledWith({
        where: { tripId: 1 },
        order: { order: 'ASC' },
      });
    });

    it('should throw NotFoundException when trip does not exist', async () => {
      tripRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByTrip(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own trip', async () => {
      tripRepository.findOne.mockResolvedValue({
        ...mockTrip,
        ownerId: 2,
      } as Trip);

      await expect(service.findAllByTrip(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByTripSlug', () => {
    it('should return all destinations for a trip by slug', async () => {
      const destinations = [
        { ...mockStartCityDestination },
        { ...mockDestination },
      ];

      tripRepository.findOne.mockResolvedValue(mockTrip as Trip);
      destinationRepository.find.mockResolvedValue(destinations as Destination[]);

      const result = await service.findAllByTripSlug('test-trip', 1);

      expect(result).toEqual(destinations);
      expect(tripRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-trip' },
      });
    });

    it('should throw NotFoundException when trip slug does not exist', async () => {
      tripRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByTripSlug('non-existent', 1)).rejects.toThrow(NotFoundException);
      await expect(service.findAllByTripSlug('non-existent', 1)).rejects.toThrow('Trip with slug non-existent not found');
    });

    it('should throw ForbiddenException when user does not own trip', async () => {
      tripRepository.findOne.mockResolvedValue({
        ...mockTrip,
        ownerId: 2,
      } as Trip);

      await expect(service.findAllByTripSlug('test-trip', 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateData: Partial<CreateDestinationDto> = {
      name: 'Updated Paris',
      arrivalDate: '2025-06-06',
      departureDate: '2025-06-09',
    };

    describe('successful updates', () => {
      it('should update destination successfully', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);
        destinationRepository.save.mockResolvedValue({
          ...mockDestination,
          ...updateData,
        } as Destination);

        const result = await service.update(1, 1, updateData, 1);

        expect(result.name).toBe('Updated Paris');
      });

      it('should strip time from date strings', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        const updateWithDateTime = {
          arrivalDate: '2025-06-06T12:00:00Z',
          departureDate: '2025-06-09T18:30:00Z',
        };

        await service.update(1, 1, updateWithDateTime, 1);

        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            arrivalDate: '2025-06-06',
            departureDate: '2025-06-09',
          })
        );
      });

      it('should update start city departure when updating first destination arrival', async () => {
        const startCity = { ...mockStartCityDestination, id: 1, order: 0 };
        const firstDest = { ...mockDestination, id: 2, order: 1 };

        const tripWithDestinations = {
          ...mockTrip,
          destinations: [startCity, firstDest],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);
        destinationRepository.save.mockResolvedValue(firstDest as Destination);

        await service.update(2, 1, { arrivalDate: '2025-06-07' }, 1);

        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 0,
            departureDate: '2025-06-07',
          })
        );
      });
    });

    describe('date validation', () => {
      it('should throw BadRequestException when arrival date is before trip start', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-15'),
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);

        await expect(
          service.update(1, 1, { arrivalDate: '2025-05-01' }, 1)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.update(1, 1, { arrivalDate: '2025-05-01' }, 1)
        ).rejects.toThrow('Arrival date must be within the trip date range');
      });

      it('should throw BadRequestException when arrival date is after trip end', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-15'),
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);

        await expect(
          service.update(1, 1, { arrivalDate: '2025-07-01' }, 1)
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when departure date is before trip start', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-15'),
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);

        await expect(
          service.update(1, 1, { departureDate: '2025-05-01' }, 1)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.update(1, 1, { departureDate: '2025-05-01' }, 1)
        ).rejects.toThrow('Departure date must be within the trip date range');
      });

      it('should throw BadRequestException when departure date is after trip end', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-15'),
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);

        await expect(
          service.update(1, 1, { departureDate: '2025-07-01' }, 1)
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when departure is before arrival', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-15'),
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);

        await expect(
          service.update(1, 1, { arrivalDate: '2025-06-10', departureDate: '2025-06-05' }, 1)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.update(1, 1, { arrivalDate: '2025-06-10', departureDate: '2025-06-05' }, 1)
        ).rejects.toThrow('Departure date cannot be before arrival date');
      });

      it('should handle Date objects in trip dates', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          startDate: new Date('2025-06-01T00:00:00Z'),
          endDate: new Date('2025-06-15T00:00:00Z'),
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        const result = await service.update(1, 1, { arrivalDate: '2025-06-10' }, 1);

        expect(result).toBeDefined();
      });

      it('should handle string dates in trip dates', async () => {
        const tripWithDestinations = {
          ...mockTrip,
          startDate: '2025-06-01' as any,
          endDate: '2025-06-15' as any,
          destinations: [mockStartCityDestination, mockDestination],
        };

        tripRepository.findOne.mockResolvedValue(tripWithDestinations as Trip);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);

        const result = await service.update(1, 1, { arrivalDate: '2025-06-10' }, 1);

        expect(result).toBeDefined();
      });
    });

    describe('validation errors', () => {
      it('should throw NotFoundException when trip does not exist', async () => {
        tripRepository.findOne.mockResolvedValue(null);

        await expect(service.update(1, 999, updateData, 1)).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user does not own trip', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          ownerId: 2,
        } as Trip);

        await expect(service.update(1, 1, updateData, 1)).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when destination does not exist', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        await expect(service.update(999, 1, updateData, 1)).rejects.toThrow(NotFoundException);
        await expect(service.update(999, 1, updateData, 1)).rejects.toThrow('Destination with ID 999 not found');
      });
    });
  });

  describe('remove', () => {
    describe('successful removal', () => {
      it('should remove a destination successfully', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { ...mockDestination, id: 2, order: 1, departureDate: '2025-06-10' },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        await service.remove(2, 1, 1);

        expect(destinationRepository.remove).toHaveBeenCalledWith(
          expect.objectContaining({ id: 2 })
        );
      });

      it('should update previous destination departure when removing last item', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { ...mockDestination, id: 2, order: 1 },
          { id: 3, name: 'Rome', order: 2, departureDate: '2025-06-12' },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        await service.remove(3, 1, 1);

        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 2,
            departureDate: '2025-06-12',
          })
        );
      });

      it('should update next destination arrival when removing middle item', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0, departureDate: '2025-06-03' },
          { ...mockDestination, id: 2, order: 1, arrivalDate: '2025-06-03', departureDate: '2025-06-06' },
          { id: 3, name: 'Rome', order: 2, arrivalDate: '2025-06-06' },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        await service.remove(2, 1, 1);

        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 3,
            arrivalDate: '2025-06-03',
          })
        );
      });

      it('should reorder remaining destinations after removal', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { ...mockDestination, id: 2, order: 1 },
          { id: 3, name: 'Rome', order: 2 },
          { id: 4, name: 'Berlin', order: 3 },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        await service.remove(2, 1, 1);

        // Should save destinations 3 and 4 with decremented order
        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ id: 3, order: 1 })
        );
        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ id: 4, order: 2 })
        );
      });
    });

    describe('validation errors', () => {
      it('should throw NotFoundException when trip does not exist', async () => {
        tripRepository.findOne.mockResolvedValue(null);

        await expect(service.remove(1, 999, 1)).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user does not own trip', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          ownerId: 2,
        } as Trip);

        await expect(service.remove(1, 1, 1)).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when destination does not exist', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination],
        } as Trip);

        await expect(service.remove(999, 1, 1)).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when trying to remove start city', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { ...mockDestination, id: 2, order: 1 },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        await expect(service.remove(1, 1, 1)).rejects.toThrow(ForbiddenException);
        await expect(service.remove(1, 1, 1)).rejects.toThrow('Cannot remove the start city');
      });
    });
  });

  describe('reorder', () => {
    describe('successful reordering', () => {
      it('should reorder destinations when moving item up', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0, arrivalDate: '2025-06-01', departureDate: '2025-06-02' },
          { id: 2, name: 'Paris', order: 1, arrivalDate: '2025-06-02', departureDate: '2025-06-04' },
          { id: 3, name: 'Rome', order: 2, arrivalDate: '2025-06-04', departureDate: '2025-06-06' },
          { id: 4, name: 'Berlin', order: 3, arrivalDate: '2025-06-06', departureDate: '2025-06-08' },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        destinationRepository.find.mockResolvedValue(destinations as Destination[]);

        // Move Berlin (order 3) to Paris position (order 1)
        await service.reorder(1, 4, 2, 1);

        expect(destinationRepository.save).toHaveBeenCalledWith(expect.arrayContaining(destinations));
      });

      it('should reorder destinations when moving item down', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { id: 2, name: 'Paris', order: 1 },
          { id: 3, name: 'Rome', order: 2 },
          { id: 4, name: 'Berlin', order: 3 },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        destinationRepository.find.mockResolvedValue(destinations as Destination[]);

        // Move Paris (order 1) to Berlin position (order 3)
        await service.reorder(1, 2, 4, 1);

        expect(destinationRepository.save).toHaveBeenCalled();
      });

      it('should return unchanged list when source equals target', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { id: 2, name: 'Paris', order: 1 },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        destinationRepository.find.mockResolvedValue(destinations as Destination[]);

        // Same position, should return without changes
        const result = await service.reorder(1, 2, 2, 1);

        expect(result).toEqual(destinations);
      });

      it('should preserve dates at positions when reordering', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0, arrivalDate: '2025-06-01', departureDate: '2025-06-02' },
          { id: 2, name: 'Paris', order: 1, arrivalDate: '2025-06-02', departureDate: '2025-06-04' },
          { id: 3, name: 'Rome', order: 2, arrivalDate: '2025-06-04', departureDate: '2025-06-06' },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        destinationRepository.find.mockResolvedValue(destinations as Destination[]);
        destinationRepository.save.mockImplementation((entities) => Promise.resolve(entities as any));

        await service.reorder(1, 3, 2, 1);

        // Verify save was called
        expect(destinationRepository.save).toHaveBeenCalled();
      });
    });

    describe('validation errors', () => {
      it('should throw NotFoundException when trip does not exist', async () => {
        tripRepository.findOne.mockResolvedValue(null);

        await expect(service.reorder(999, 1, 2, 1)).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user does not own trip', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          ownerId: 2,
        } as Trip);

        await expect(service.reorder(1, 1, 2, 1)).rejects.toThrow(ForbiddenException);
      });

      it('should throw NotFoundException when source destination does not exist', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination, mockDestination],
        } as Trip);

        await expect(service.reorder(1, 999, 1, 1)).rejects.toThrow(NotFoundException);
        await expect(service.reorder(1, 999, 1, 1)).rejects.toThrow('Source destination with ID 999 not found');
      });

      it('should throw NotFoundException when target destination does not exist', async () => {
        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations: [mockStartCityDestination, mockDestination],
        } as Trip);

        await expect(service.reorder(1, 1, 999, 1)).rejects.toThrow(NotFoundException);
        await expect(service.reorder(1, 1, 999, 1)).rejects.toThrow('Target destination with ID 999 not found');
      });

      it('should throw ForbiddenException when trying to reorder start city as source', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { ...mockDestination, id: 2, order: 1 },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        await expect(service.reorder(1, 1, 2, 1)).rejects.toThrow(ForbiddenException);
        await expect(service.reorder(1, 1, 2, 1)).rejects.toThrow('Cannot reorder the start city');
      });

      it('should throw ForbiddenException when trying to reorder to start city position', async () => {
        const destinations = [
          { ...mockStartCityDestination, id: 1, order: 0 },
          { ...mockDestination, id: 2, order: 1 },
        ];

        tripRepository.findOne.mockResolvedValue({
          ...mockTrip,
          destinations,
        } as Trip);

        await expect(service.reorder(1, 2, 1, 1)).rejects.toThrow(ForbiddenException);
      });
    });
  });
});
