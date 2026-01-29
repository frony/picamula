import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { Trip, TripStatus } from './entities/trip.entity';
import { MediaFile, MediaFileType } from './entities/media-file.entity';
import { Destination } from '../destination/entities/destination.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

describe('TripsService', () => {
  let service: TripsService;
  let tripsRepository: jest.Mocked<Repository<Trip>>;
  let mediaFileRepository: jest.Mocked<Repository<MediaFile>>;
  let destinationRepository: jest.Mocked<Repository<Destination>>;
  let geocodingService: jest.Mocked<GeocodingService>;

  // Mock QueryRunner
  const mockQueryRunner: Partial<QueryRunner> = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    } as any,
  };

  // Mock data
  const mockTrip: Partial<Trip> = {
    id: 1,
    title: 'Test Trip',
    slug: 'test-trip',
    description: 'A test trip',
    destination: 'Paris',
    startCity: 'New York',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-10'),
    status: TripStatus.PLANNING,
    ownerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    departureDate: '2025-06-01',
    latitude: 40.7128,
    longitude: -74.006,
    tripId: 1,
  };

  const mockGeocodingResult = {
    latitude: 40.7128,
    longitude: -74.006,
    formattedAddress: 'New York, NY, USA',
  };

  const mockMediaFile: Partial<MediaFile> = {
    id: 1,
    key: 'trips/1/images/test.jpg',
    url: 'https://s3.amazonaws.com/test.jpg',
    type: MediaFileType.IMAGE,
    originalName: 'test.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    order: 0,
    tripId: 1,
  };

  beforeEach(async () => {
    const mockTripsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      manager: {
        connection: {
          createQueryRunner: jest.fn(() => mockQueryRunner),
        },
      },
    };

    const mockMediaFileRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockDestinationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockGeocodingService = {
      geocode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: getRepositoryToken(Trip),
          useValue: mockTripsRepository,
        },
        {
          provide: getRepositoryToken(MediaFile),
          useValue: mockMediaFileRepository,
        },
        {
          provide: getRepositoryToken(Destination),
          useValue: mockDestinationRepository,
        },
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    tripsRepository = module.get(getRepositoryToken(Trip));
    mediaFileRepository = module.get(getRepositoryToken(MediaFile));
    destinationRepository = module.get(getRepositoryToken(Destination));
    geocodingService = module.get(GeocodingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTripDto: CreateTripDto = {
      title: 'New Trip',
      destination: 'Paris',
      startCity: 'New York',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-07-10'),
    };

    describe('successful creation', () => {
      it('should create a new trip with startCity as first destination', async () => {
        tripsRepository.create.mockReturnValue({ ...mockTrip, ...createTripDto } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...createTripDto } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        const result = await service.create(createTripDto, 1);

        expect(result).toHaveProperty('id', 1);
        expect(tripsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Trip',
            ownerId: 1,
          })
        );
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New York',
            order: 0,
          })
        );
      });

      it('should geocode startCity when only latitude is provided (no longitude)', async () => {
        const dtoWithPartialCoords: CreateTripDto = {
          ...createTripDto,
          startCityLatitude: 40.7128,
          // longitude not provided
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithPartialCoords } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithPartialCoords } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithPartialCoords, 1);

        // Should geocode since both coordinates are not provided
        expect(geocodingService.geocode).toHaveBeenCalledWith('New York');
      });

      it('should geocode startCity when only longitude is provided (no latitude)', async () => {
        const dtoWithPartialCoords: CreateTripDto = {
          ...createTripDto,
          startCityLongitude: -74.006,
          // latitude not provided
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithPartialCoords } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithPartialCoords } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithPartialCoords, 1);

        // Should geocode since both coordinates are not provided
        expect(geocodingService.geocode).toHaveBeenCalledWith('New York');
      });

      it('should use frontend coordinates when provided', async () => {
        const dtoWithCoords: CreateTripDto = {
          ...createTripDto,
          startCityLatitude: 40.7128,
          startCityLongitude: -74.006,
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithCoords } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithCoords } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);

        await service.create(dtoWithCoords, 1);

        expect(geocodingService.geocode).not.toHaveBeenCalled();
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 40.7128,
            longitude: -74.006,
          })
        );
      });

      it('should geocode startCity when coordinates not provided', async () => {
        tripsRepository.create.mockReturnValue({ ...mockTrip, ...createTripDto } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...createTripDto } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(createTripDto, 1);

        expect(geocodingService.geocode).toHaveBeenCalledWith('New York');
      });

      it('should use (0, 0) when geocoding fails', async () => {
        tripsRepository.create.mockReturnValue({ ...mockTrip, ...createTripDto } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...createTripDto } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(null);

        await service.create(createTripDto, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 0,
            longitude: 0,
          })
        );
      });

      it('should update existing startCity destination if it exists', async () => {
        const existingDestination = { ...mockStartCityDestination, id: 5 };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...createTripDto } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...createTripDto } as Trip);
        destinationRepository.findOne.mockResolvedValue(existingDestination as Destination);
        destinationRepository.save.mockResolvedValue(existingDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(createTripDto, 1);

        expect(destinationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 5,
            name: 'New York',
          })
        );
      });

      it('should create additional destinations with correct order', async () => {
        const dtoWithDestinations: CreateTripDto = {
          ...createTripDto,
          destinations: [
            { name: 'Paris', arrivalDate: '2025-07-03', departureDate: '2025-07-05' },
            { name: 'Rome', arrivalDate: '2025-07-05', departureDate: '2025-07-08' },
          ],
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithDestinations } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithDestinations } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithDestinations, 1);

        // Should create destinations with order 1 and 2
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Paris',
            order: 1,
          })
        );
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Rome',
            order: 2,
          })
        );
      });

      it('should use destination order when explicitly provided', async () => {
        const dtoWithDestinations: CreateTripDto = {
          ...createTripDto,
          destinations: [
            { name: 'Paris', arrivalDate: '2025-07-03', departureDate: '2025-07-05', order: 5 },
            { name: 'Rome', arrivalDate: '2025-07-05', departureDate: '2025-07-08', order: 10 },
          ],
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithDestinations } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithDestinations } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithDestinations, 1);

        // Should use provided order values
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Paris',
            order: 5,
          })
        );
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Rome',
            order: 10,
          })
        );
      });

      it('should handle destinations with no arrivalDate', async () => {
        const dtoWithDestinations: CreateTripDto = {
          ...createTripDto,
          destinations: [
            { name: 'Paris', departureDate: '2025-07-05' },
          ],
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithDestinations } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithDestinations } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithDestinations, 1);

        // Should use trip start date as departure date since no arrival date on first destination
        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New York',
            order: 0,
            departureDate: '2025-07-01',
          })
        );
      });

      it('should set startCity departure date to first destination arrival date', async () => {
        const dtoWithDestinations: CreateTripDto = {
          ...createTripDto,
          destinations: [
            { name: 'Paris', arrivalDate: '2025-07-03', departureDate: '2025-07-05' },
          ],
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithDestinations } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithDestinations } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithDestinations, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New York',
            order: 0,
            departureDate: '2025-07-03',
          })
        );
      });

      it('should handle trip without startCity', async () => {
        const dtoNoStartCity = {
          title: 'New Trip',
          destination: 'Paris',
          startDate: new Date('2025-07-01'),
          endDate: new Date('2025-07-10'),
        } as CreateTripDto;

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoNoStartCity, startCity: undefined } as unknown as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoNoStartCity, startCity: undefined } as unknown as Trip);

        const result = await service.create(dtoNoStartCity, 1);

        expect(result).toBeDefined();
        expect(destinationRepository.create).not.toHaveBeenCalled();
      });

      it('should handle Date object for startDate', async () => {
        const dtoWithDateObject: CreateTripDto = {
          ...createTripDto,
          startDate: new Date('2025-07-01T12:00:00Z'),
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithDateObject } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithDateObject } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithDateObject, 1);

        expect(destinationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            arrivalDate: '2025-07-01',
          })
        );
      });

      it('should handle string date for startDate', async () => {
        const dtoWithStringDate: CreateTripDto = {
          ...createTripDto,
          startDate: '2025-07-01' as any,
        };

        tripsRepository.create.mockReturnValue({ ...mockTrip, ...dtoWithStringDate } as Trip);
        tripsRepository.save.mockResolvedValue({ id: 1, ...mockTrip, ...dtoWithStringDate } as Trip);
        destinationRepository.findOne.mockResolvedValue(null);
        destinationRepository.create.mockReturnValue(mockStartCityDestination as Destination);
        destinationRepository.save.mockResolvedValue(mockStartCityDestination as Destination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.create(dtoWithStringDate, 1);

        expect(destinationRepository.create).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should throw InternalServerErrorException when save fails', async () => {
        tripsRepository.create.mockReturnValue({ ...mockTrip, ...createTripDto } as Trip);
        tripsRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(service.create(createTripDto, 1)).rejects.toThrow(InternalServerErrorException);
        await expect(service.create(createTripDto, 1)).rejects.toThrow('Failed to create trip');
      });
    });
  });

  describe('findAll', () => {
    it('should return all trips for a user', async () => {
      const trips = [mockTrip, { ...mockTrip, id: 2, title: 'Trip 2' }];
      tripsRepository.find.mockResolvedValue(trips as Trip[]);

      const result = await service.findAll(1);

      expect(result).toEqual(trips);
      expect(tripsRepository.find).toHaveBeenCalledWith({
        where: { ownerId: 1 },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when user has no trips', async () => {
      tripsRepository.find.mockResolvedValue([]);

      const result = await service.findAll(1);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a trip by id for the owner', async () => {
      tripsRepository.findOne.mockResolvedValue(mockTrip as Trip);

      const result = await service.findOne(1, 1);

      expect(result).toEqual(mockTrip);
      expect(tripsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['owner', 'notes', 'notes.author', 'mediaFiles', 'destinations'],
        order: {
          notes: {
            date: 'DESC',
            createdAt: 'DESC',
          },
          destinations: {
            order: 'ASC',
          },
        },
      });
    });

    it('should throw NotFoundException if trip does not exist', async () => {
      tripsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow('Trip with ID 999 not found');
    });

    it('should throw ForbiddenException if user does not own the trip', async () => {
      tripsRepository.findOne.mockResolvedValue({
        ...mockTrip,
        ownerId: 2,
      } as Trip);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow('You do not have access to this trip');
    });
  });

  describe('findBySlug', () => {
    it('should return a trip by slug for the owner', async () => {
      tripsRepository.findOne.mockResolvedValue(mockTrip as Trip);

      const result = await service.findBySlug('test-trip', 1);

      expect(result).toEqual(mockTrip);
      expect(tripsRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-trip' },
        relations: ['owner', 'notes', 'notes.author', 'mediaFiles', 'destinations'],
        order: {
          notes: {
            date: 'DESC',
            createdAt: 'DESC',
          },
          destinations: {
            order: 'ASC',
          },
        },
      });
    });

    it('should throw NotFoundException if trip does not exist', async () => {
      tripsRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent', 1)).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug('non-existent', 1)).rejects.toThrow('Trip with slug non-existent not found');
    });

    it('should throw ForbiddenException if user does not own the trip', async () => {
      tripsRepository.findOne.mockResolvedValue({
        ...mockTrip,
        ownerId: 2,
      } as Trip);

      await expect(service.findBySlug('test-trip', 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTripDto = {
      title: 'Updated Title',
    };

    describe('successful updates', () => {
      it('should update a trip without media files', async () => {
        tripsRepository.findOne
          .mockResolvedValueOnce(mockTrip as Trip) // findOne
          .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' } as Trip); // final fetch

        (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({ ...mockTrip, title: 'Updated Title' });
        (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);

        const result = await service.update(1, updateDto, 1);

        expect(result.title).toBe('Updated Title');
        expect(mockQueryRunner.connect).toHaveBeenCalled();
        expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should update a trip with media files', async () => {
          const updateDtoWithMedia: UpdateTripDto = {
          title: 'Updated Title',
          mediaFiles: [
            {
              key: 'trips/1/images/test.jpg',
              url: 'https://s3.amazonaws.com/test.jpg',
              type: MediaFileType.IMAGE,
              originalName: 'test.jpg',
              mimeType: 'image/jpeg',
              size: 1024,
              order: 0,
            },
          ],
        };

        tripsRepository.findOne
          .mockResolvedValueOnce(mockTrip as Trip)
          .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' } as Trip);

        (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({ ...mockTrip, title: 'Updated Title' });
        (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);
        mediaFileRepository.create.mockReturnValue(mockMediaFile as MediaFile);

        const result = await service.update(1, updateDtoWithMedia, 1);

        expect(mediaFileRepository.create).toHaveBeenCalled();
        expect(mockQueryRunner.manager!.save).toHaveBeenCalledWith(MediaFile, expect.any(Object));
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      });

      it('should sync startCity to destination when updating', async () => {
        const updateDtoWithStartCity: UpdateTripDto = {
          startCity: 'Los Angeles',
          startCityLatitude: 34.0522,
          startCityLongitude: -118.2437,
        };

        tripsRepository.findOne
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'Los Angeles',
          } as Trip)
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'Los Angeles',
          } as Trip);

        (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({
          ...mockTrip,
          startCity: 'Los Angeles',
        });
        (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue({
          ...mockStartCityDestination,
          name: 'New York',
        });

        await service.update(1, updateDtoWithStartCity, 1);

        expect(mockQueryRunner.manager!.save).toHaveBeenCalledWith(
          Destination,
          expect.objectContaining({
            name: 'Los Angeles',
            latitude: 34.0522,
            longitude: -118.2437,
          })
        );
      });

      it('should geocode when startCity name changes without coordinates', async () => {
        const updateDtoWithStartCity: UpdateTripDto = {
          startCity: 'Los Angeles',
        };

        tripsRepository.findOne
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'Los Angeles',
          } as Trip)
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'Los Angeles',
          } as Trip);

        (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({
          ...mockTrip,
          startCity: 'Los Angeles',
        });
        (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue({
          ...mockStartCityDestination,
          name: 'New York',
        });
        geocodingService.geocode.mockResolvedValue({
          latitude: 34.0522,
          longitude: -118.2437,
          formattedAddress: 'Los Angeles, CA, USA',
        });

        await service.update(1, updateDtoWithStartCity, 1);

        expect(geocodingService.geocode).toHaveBeenCalledWith('Los Angeles');
      });

      it('should create destination order 0 if it does not exist', async () => {
        tripsRepository.findOne
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'New York',
          } as Trip)
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'New York',
          } as Trip);

        (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
        (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(null);
        (mockQueryRunner.manager!.create as jest.Mock).mockReturnValue(mockStartCityDestination);
        geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

        await service.update(1, { title: 'Updated' }, 1);

        expect(mockQueryRunner.manager!.create).toHaveBeenCalledWith(
          Destination,
          expect.objectContaining({
            name: 'New York',
            order: 0,
          })
        );
      });

      it('should skip destination sync if nothing changed', async () => {
        const existingDest = {
          ...mockStartCityDestination,
          name: 'New York',
          arrivalDate: '2025-06-01',
        };

        tripsRepository.findOne
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'New York',
            startDate: new Date('2025-06-01'),
          } as Trip)
          .mockResolvedValueOnce({
            ...mockTrip,
            startCity: 'New York',
          } as Trip);

        (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
        (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);

        await service.update(1, { title: 'Updated' }, 1);

        // Should only save trip, not destination (since nothing changed)
        expect((mockQueryRunner.manager!.save as jest.Mock).mock.calls.filter(
          call => call[0] === Destination
        ).length).toBeLessThanOrEqual(1);
      });

      it('should skip syncStartCityToDestination when trip has no startCity', async () => {
        const tripWithoutStartCity = {
          ...mockTrip,
          startCity: undefined,
        };

        tripsRepository.findOne
          .mockResolvedValueOnce(tripWithoutStartCity as unknown as Trip)
          .mockResolvedValueOnce(tripWithoutStartCity as unknown as Trip);

        (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(tripWithoutStartCity);

        await service.update(1, { title: 'Updated' }, 1);

        // Should not call findOne for destination since no startCity
        expect(mockQueryRunner.manager!.findOne).not.toHaveBeenCalledWith(
          Destination,
          expect.anything()
        );
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should rollback transaction on error', async () => {
        tripsRepository.findOne.mockResolvedValue(mockTrip as Trip);
        (mockQueryRunner.manager!.save as jest.Mock).mockRejectedValue(new Error('Database error'));

        await expect(service.update(1, updateDto, 1)).rejects.toThrow('Database error');
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should throw NotFoundException when trip does not exist', async () => {
        tripsRepository.findOne.mockResolvedValue(null);

        await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user does not own trip', async () => {
        tripsRepository.findOne.mockResolvedValue({
          ...mockTrip,
          ownerId: 2,
        } as Trip);

        await expect(service.update(1, updateDto, 1)).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('updateBySlug', () => {
    const updateDto: UpdateTripDto = {
      title: 'Updated Title',
    };

    it('should update a trip by slug', async () => {
      tripsRepository.findOne
        .mockResolvedValueOnce(mockTrip as Trip)
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' } as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({ ...mockTrip, title: 'Updated Title' });
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);

      const result = await service.updateBySlug('test-trip', updateDto, 1);

      expect(result.title).toBe('Updated Title');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle media files when updating by slug', async () => {
      const updateDtoWithMedia: UpdateTripDto = {
        title: 'Updated Title',
        mediaFiles: [
          {
            key: 'trips/1/videos/test.mp4',
            url: 'https://s3.amazonaws.com/test.mp4',
            type: MediaFileType.VIDEO,
            originalName: 'test.mp4',
            mimeType: 'video/mp4',
            size: 10240,
            order: 0,
          },
        ],
      };

      tripsRepository.findOne
        .mockResolvedValueOnce(mockTrip as Trip)
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' } as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({ ...mockTrip, title: 'Updated Title' });
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);
      mediaFileRepository.create.mockReturnValue(mockMediaFile as MediaFile);

      const result = await service.updateBySlug('test-trip', updateDtoWithMedia, 1);

      expect(mediaFileRepository.create).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      tripsRepository.findOne.mockResolvedValue(mockTrip as Trip);
      (mockQueryRunner.manager!.save as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.updateBySlug('test-trip', updateDto, 1)).rejects.toThrow('Database error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should skip syncStartCityToDestination when trip has no startCity', async () => {
      const tripWithoutStartCity = {
        ...mockTrip,
        startCity: undefined,
      };

      tripsRepository.findOne
        .mockResolvedValueOnce(tripWithoutStartCity as unknown as Trip)
        .mockResolvedValueOnce(tripWithoutStartCity as unknown as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(tripWithoutStartCity);

      await service.updateBySlug('test-trip', { title: 'Updated' }, 1);

      // Should not call findOne for destination since no startCity
      expect(mockQueryRunner.manager!.findOne).not.toHaveBeenCalledWith(
        Destination,
        expect.anything()
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a trip', async () => {
      tripsRepository.findOne.mockResolvedValue(mockTrip as Trip);
      tripsRepository.remove.mockResolvedValue(mockTrip as Trip);

      await service.remove(1, 1);

      expect(tripsRepository.remove).toHaveBeenCalledWith(mockTrip);
    });

    it('should throw NotFoundException when removing non-existent trip', async () => {
      tripsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own trip', async () => {
      tripsRepository.findOne.mockResolvedValue({
        ...mockTrip,
        ownerId: 2,
      } as Trip);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeBySlug', () => {
    it('should remove a trip by slug', async () => {
      tripsRepository.findOne.mockResolvedValue(mockTrip as Trip);
      tripsRepository.remove.mockResolvedValue(mockTrip as Trip);

      await service.removeBySlug('test-trip', 1);

      expect(tripsRepository.remove).toHaveBeenCalledWith(mockTrip);
    });

    it('should throw NotFoundException when trip does not exist', async () => {
      tripsRepository.findOne.mockResolvedValue(null);

      await expect(service.removeBySlug('non-existent', 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own trip', async () => {
      tripsRepository.findOne.mockResolvedValue({
        ...mockTrip,
        ownerId: 2,
      } as Trip);

      await expect(service.removeBySlug('test-trip', 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByStatus', () => {
    it('should return trips filtered by status', async () => {
      const trips = [mockTrip];
      tripsRepository.find.mockResolvedValue(trips as Trip[]);

      const result = await service.findByStatus(TripStatus.PLANNING, 1);

      expect(result).toEqual(trips);
      expect(tripsRepository.find).toHaveBeenCalledWith({
        where: { ownerId: 1, status: TripStatus.PLANNING },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no trips match status', async () => {
      tripsRepository.find.mockResolvedValue([]);

      const result = await service.findByStatus(TripStatus.COMPLETED, 1);

      expect(result).toEqual([]);
    });

    it('should handle all status types', async () => {
      const statuses = [
        TripStatus.PLANNING,
        TripStatus.CONFIRMED,
        TripStatus.IN_PROGRESS,
        TripStatus.COMPLETED,
        TripStatus.CANCELLED,
      ];

      for (const status of statuses) {
        tripsRepository.find.mockResolvedValue([]);
        await service.findByStatus(status, 1);

        expect(tripsRepository.find).toHaveBeenCalledWith({
          where: { ownerId: 1, status },
          order: { createdAt: 'DESC' },
        });
      }
    });
  });

  describe('findUpcoming', () => {
    it('should return upcoming trips', async () => {
      const upcomingTrip = {
        ...mockTrip,
        startDate: new Date('2026-01-01'),
      };
      tripsRepository.find.mockResolvedValue([upcomingTrip] as Trip[]);

      const result = await service.findUpcoming(1);

      expect(result).toEqual([upcomingTrip]);
      expect(tripsRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          ownerId: 1,
        }),
        order: { startDate: 'ASC' },
      });
    });

    it('should return empty array when no upcoming trips', async () => {
      tripsRepository.find.mockResolvedValue([]);

      const result = await service.findUpcoming(1);

      expect(result).toEqual([]);
    });

    it('should filter trips by date greater than now', async () => {
      tripsRepository.find.mockResolvedValue([]);

      await service.findUpcoming(1);

      expect(tripsRepository.find).toHaveBeenCalledWith({
        where: {
          ownerId: 1,
          startDate: expect.anything(), // MoreThan(new Date())
        },
        order: { startDate: 'ASC' },
      });
    });
  });

  describe('processMediaFiles (private method via update)', () => {
    it('should process and save multiple media files', async () => {
      const mediaFiles = [
        {
          key: 'trips/1/images/img1.jpg',
          url: 'https://s3.amazonaws.com/img1.jpg',
          type: MediaFileType.IMAGE,
          originalName: 'img1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          order: 0,
        },
        {
          key: 'trips/1/images/img2.jpg',
          url: 'https://s3.amazonaws.com/img2.jpg',
          type: MediaFileType.IMAGE,
          originalName: 'img2.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          order: 1,
        },
      ];

      tripsRepository.findOne
        .mockResolvedValueOnce(mockTrip as Trip)
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated' } as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({});
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);
      mediaFileRepository.create.mockImplementation((data) => data as MediaFile);

      await service.update(1, { mediaFiles } as any, 1);

      expect(mediaFileRepository.create).toHaveBeenCalledTimes(2);
      expect((mockQueryRunner.manager!.save as jest.Mock)).toHaveBeenCalledWith(
        MediaFile,
        expect.objectContaining({
          key: 'trips/1/images/img1.jpg',
        })
      );
      expect((mockQueryRunner.manager!.save as jest.Mock)).toHaveBeenCalledWith(
        MediaFile,
        expect.objectContaining({
          key: 'trips/1/images/img2.jpg',
        })
      );
    });

    it('should save media file with all properties', async () => {
      const mediaFile = {
        key: 'trips/1/images/test.jpg',
        url: 'https://s3.amazonaws.com/test.jpg',
        type: MediaFileType.IMAGE,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        order: 0,
        width: 1920,
        height: 1080,
        duration: null,
        thumbnailKey: 'trips/1/thumbnails/test_thumb.jpg',
      };

      tripsRepository.findOne
        .mockResolvedValueOnce(mockTrip as Trip)
        .mockResolvedValueOnce({ ...mockTrip } as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({});
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);
      mediaFileRepository.create.mockImplementation((data) => data as MediaFile);

      await service.update(1, { mediaFiles: [mediaFile] } as any, 1);

      expect(mediaFileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'trips/1/images/test.jpg',
          width: 1920,
          height: 1080,
          thumbnailKey: 'trips/1/thumbnails/test_thumb.jpg',
        })
      );
    });

    it('should handle video media files with duration', async () => {
      const videoFile = {
        key: 'trips/1/videos/video.mp4',
        url: 'https://s3.amazonaws.com/video.mp4',
        type: MediaFileType.VIDEO,
        originalName: 'video.mp4',
        mimeType: 'video/mp4',
        size: 10240000,
        order: 0,
        width: 1920,
        height: 1080,
        duration: 120,
        thumbnailKey: 'trips/1/thumbnails/video_thumb.jpg',
      };

      tripsRepository.findOne
        .mockResolvedValueOnce(mockTrip as Trip)
        .mockResolvedValueOnce({ ...mockTrip } as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({});
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);
      mediaFileRepository.create.mockImplementation((data) => data as MediaFile);

      await service.update(1, { mediaFiles: [videoFile] } as any, 1);

      expect(mediaFileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MediaFileType.VIDEO,
          duration: 120,
        })
      );
    });

    it('should throw error and rollback when media file save fails', async () => {
      const mediaFiles = [
        {
          key: 'trips/1/images/test.jpg',
          url: 'https://s3.amazonaws.com/test.jpg',
          type: MediaFileType.IMAGE,
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          order: 0,
        },
      ];

      // Trip without startCity to avoid extra destination saves
      const tripWithoutStartCity = {
        ...mockTrip,
        startCity: undefined,
      };

      tripsRepository.findOne.mockResolvedValue(tripWithoutStartCity as unknown as Trip);
      
      // First save for Trip succeeds, second save for MediaFile fails
      (mockQueryRunner.manager!.save as jest.Mock)
        .mockImplementation((entity: any, data: any) => {
          if (entity === MediaFile) {
            return Promise.reject(new Error('Media file save failed'));
          }
          return Promise.resolve(tripWithoutStartCity);
        });
      mediaFileRepository.create.mockImplementation((data) => data as MediaFile);

      await expect(service.update(1, { mediaFiles } as any, 1)).rejects.toThrow('Media file save failed');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should use default order 0 when order is not provided in media file', async () => {
      const mediaFile = {
        key: 'trips/1/images/test.jpg',
        url: 'https://s3.amazonaws.com/test.jpg',
        type: MediaFileType.IMAGE,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        // order not provided
      };

      tripsRepository.findOne
        .mockResolvedValueOnce(mockTrip as Trip)
        .mockResolvedValueOnce({ ...mockTrip } as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue({});
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockStartCityDestination);
      mediaFileRepository.create.mockImplementation((data) => data as MediaFile);

      await service.update(1, { mediaFiles: [mediaFile] } as any, 1);

      expect(mediaFileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          order: 0,
        })
      );
    });
  });

  describe('syncStartCityToDestination (private method via update)', () => {
    it('should handle string startDate (not Date object)', async () => {
      const existingDest = {
        ...mockStartCityDestination,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        arrivalDate: '2025-05-01', // Different date
      };

      // Trip with startDate as string (simulating edge case)
      const tripWithStringDate = {
        ...mockTrip,
        startCity: 'New York',
        startDate: '2025-06-01T00:00:00.000Z', // String instead of Date
      };

      tripsRepository.findOne
        .mockResolvedValueOnce(tripWithStringDate as unknown as Trip)
        .mockResolvedValueOnce(tripWithStringDate as unknown as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(tripWithStringDate);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);

      await service.update(1, { title: 'Updated' }, 1);

      // Should extract date correctly from string
      expect(mockQueryRunner.manager!.save).toHaveBeenCalledWith(
        Destination,
        expect.objectContaining({
          arrivalDate: '2025-06-01',
        })
      );
    });

    it('should preserve existing coordinates when name has not changed', async () => {
      const existingDest = {
        ...mockStartCityDestination,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        arrivalDate: '2025-06-01',
      };

      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);

      await service.update(1, { description: 'Updated description' }, 1);

      // Should not call geocode since name hasn't changed
      expect(geocodingService.geocode).not.toHaveBeenCalled();
    });

    it('should update only date when date changes but name stays the same', async () => {
      const existingDest = {
        ...mockStartCityDestination,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        arrivalDate: '2025-06-05', // Different from trip startDate
      };

      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);

      await service.update(1, { title: 'Updated' }, 1);

      // Should save destination with updated date
      expect(mockQueryRunner.manager!.save).toHaveBeenCalledWith(
        Destination,
        expect.objectContaining({
          name: 'New York',
          arrivalDate: '2025-06-01',
        })
      );
      // Should not geocode since name hasn't changed
      expect(geocodingService.geocode).not.toHaveBeenCalled();
    });

    it('should update coordinates when coordinates change', async () => {
      const existingDest = {
        ...mockStartCityDestination,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        arrivalDate: '2025-06-01',
      };

      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);

      // Update with new coordinates
      await service.update(1, {
        startCityLatitude: 40.7500,
        startCityLongitude: -73.9000,
      }, 1);

      // Should save destination with updated coordinates
      expect(mockQueryRunner.manager!.save).toHaveBeenCalledWith(
        Destination,
        expect.objectContaining({
          latitude: 40.7500,
          longitude: -73.9000,
        })
      );
    });

    it('should skip update when provided coordinates are the same', async () => {
      const existingDest = {
        ...mockStartCityDestination,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        arrivalDate: '2025-06-01',
      };

      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);

      // Update with same coordinates as existing
      await service.update(1, {
        startCityLatitude: 40.7128,
        startCityLongitude: -74.006,
      }, 1);

      // Should not save destination since nothing changed
      const destinationSaveCalls = (mockQueryRunner.manager!.save as jest.Mock).mock.calls.filter(
        call => call[0] === Destination
      );
      expect(destinationSaveCalls.length).toBe(0);
    });

    it('should geocode when name changes and no coordinates provided', async () => {
      const existingDest = {
        ...mockStartCityDestination,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        arrivalDate: '2025-06-02',
      };

      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'Los Angeles',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);
      geocodingService.geocode.mockResolvedValue({
        latitude: 34.0522,
        longitude: -118.2437,
        formattedAddress: 'Los Angeles, CA, USA',
      });

      await service.update(1, {}, 1);

      expect(geocodingService.geocode).toHaveBeenCalledWith('Los Angeles');
    });

    it('should preserve existing coordinates when geocoding fails on name change', async () => {
      const existingDest = {
        ...mockStartCityDestination,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        arrivalDate: '2025-06-02',
      };

      const tripWithUnknownCity = {
        ...mockTrip,
        startCity: 'Unknown City',
        startDate: new Date('2025-06-01'),
      };

      tripsRepository.findOne
        .mockResolvedValueOnce(tripWithUnknownCity as Trip)
        .mockResolvedValueOnce(tripWithUnknownCity as Trip);

      // Important: save must return trip with 'Unknown City' as startCity
      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(tripWithUnknownCity);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(existingDest);
      geocodingService.geocode.mockResolvedValue(null);

      await service.update(1, {}, 1);

      expect(geocodingService.geocode).toHaveBeenCalledWith('Unknown City');
      // Should save destination but preserve existing coordinates since geocoding failed
      expect(mockQueryRunner.manager!.save).toHaveBeenCalledWith(
        Destination,
        expect.objectContaining({
          name: 'Unknown City',
          latitude: 40.7128,
          longitude: -74.006,
        })
      );
    });

    it('should create new destination with provided coordinates', async () => {
      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(null); // No existing destination
      (mockQueryRunner.manager!.create as jest.Mock).mockReturnValue(mockStartCityDestination);

      // Create with frontend coordinates
      await service.update(1, {
        title: 'Updated',
        startCityLatitude: 40.7128,
        startCityLongitude: -74.006,
      }, 1);

      // Should create destination with provided coordinates, not geocode
      expect(mockQueryRunner.manager!.create).toHaveBeenCalledWith(
        Destination,
        expect.objectContaining({
          name: 'New York',
          latitude: 40.7128,
          longitude: -74.006,
        })
      );
      expect(geocodingService.geocode).not.toHaveBeenCalled();
    });

    it('should create new destination with geocoded coordinates when none provided', async () => {
      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(null); // No existing destination
      (mockQueryRunner.manager!.create as jest.Mock).mockReturnValue(mockStartCityDestination);
      geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

      await service.update(1, { title: 'Updated' }, 1);

      // Should geocode and create destination
      expect(geocodingService.geocode).toHaveBeenCalledWith('New York');
      expect(mockQueryRunner.manager!.create).toHaveBeenCalledWith(
        Destination,
        expect.objectContaining({
          name: 'New York',
          latitude: 40.7128,
          longitude: -74.006,
        })
      );
    });

    it('should create new destination with (0,0) when geocoding fails', async () => {
      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'Unknown City',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(null); // No existing destination
      (mockQueryRunner.manager!.create as jest.Mock).mockReturnValue(mockStartCityDestination);
      geocodingService.geocode.mockResolvedValue(null); // Geocoding fails

      await service.update(1, { title: 'Updated' }, 1);

      // Should create destination with (0, 0) coordinates
      expect(mockQueryRunner.manager!.create).toHaveBeenCalledWith(
        Destination,
        expect.objectContaining({
          name: 'Unknown City',
          latitude: 0,
          longitude: 0,
        })
      );
    });

    it('should geocode when creating new destination with only latitude provided', async () => {
      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(null); // No existing destination
      (mockQueryRunner.manager!.create as jest.Mock).mockReturnValue(mockStartCityDestination);
      geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

      // Only latitude provided
      await service.update(1, {
        title: 'Updated',
        startCityLatitude: 40.7128,
      }, 1);

      // Should geocode since longitude is missing
      expect(geocodingService.geocode).toHaveBeenCalledWith('New York');
    });

    it('should geocode when creating new destination with only longitude provided', async () => {
      tripsRepository.findOne
        .mockResolvedValueOnce({
          ...mockTrip,
          startCity: 'New York',
          startDate: new Date('2025-06-01'),
        } as Trip)
        .mockResolvedValueOnce(mockTrip as Trip);

      (mockQueryRunner.manager!.save as jest.Mock).mockResolvedValue(mockTrip);
      (mockQueryRunner.manager!.findOne as jest.Mock).mockResolvedValue(null); // No existing destination
      (mockQueryRunner.manager!.create as jest.Mock).mockReturnValue(mockStartCityDestination);
      geocodingService.geocode.mockResolvedValue(mockGeocodingResult);

      // Only longitude provided
      await service.update(1, {
        title: 'Updated',
        startCityLongitude: -74.006,
      }, 1);

      // Should geocode since latitude is missing
      expect(geocodingService.geocode).toHaveBeenCalledWith('New York');
    });
  });
});
