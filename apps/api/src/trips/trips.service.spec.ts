import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { Trip } from './entities/trip.entity';
import { MediaFile } from './entities/media-file.entity';
import { S3Service } from '../s3/s3.service';
import { TripStatus } from '@junta-tribo/shared';

describe('TripsService', () => {
  let service: TripsService;
  let tripsRepository: Repository<Trip>;
  let mediaFileRepository: Repository<MediaFile>;
  let s3Service: S3Service;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

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

  const mockS3Service = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockTrip: Partial<Trip> = {
    id: 1,
    title: 'Test Trip',
    slug: 'test-trip',
    description: 'A test trip',
    destination: 'Paris',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-10'),
    status: TripStatus.PLANNING,
    ownerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
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
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    tripsRepository = module.get<Repository<Trip>>(getRepositoryToken(Trip));
    mediaFileRepository = module.get<Repository<MediaFile>>(getRepositoryToken(MediaFile));
    s3Service = module.get<S3Service>(S3Service);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new trip', async () => {
      const createTripDto = {
        title: 'New Trip',
        destination: 'Rome',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-10'),
      };
      const ownerId = 1;

      mockTripsRepository.create.mockReturnValue({ ...createTripDto, ownerId });
      mockTripsRepository.save.mockResolvedValue({ id: 2, ...createTripDto, ownerId });

      const result = await service.create(createTripDto as any, ownerId);

      expect(result).toHaveProperty('id', 2);
      expect(result.title).toBe('New Trip');
      expect(mockTripsRepository.create).toHaveBeenCalledWith({
        ...createTripDto,
        ownerId,
      });
      expect(mockTripsRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all trips for a user', async () => {
      const userId = 1;
      const trips = [mockTrip, { ...mockTrip, id: 2, title: 'Trip 2' }];

      mockTripsRepository.find.mockResolvedValue(trips);

      const result = await service.findAll(userId);

      expect(result).toEqual(trips);
      expect(mockTripsRepository.find).toHaveBeenCalledWith({
        where: { ownerId: userId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a trip by id for the owner', async () => {
      const tripId = 1;
      const userId = 1;

      mockTripsRepository.findOne.mockResolvedValue(mockTrip);

      const result = await service.findOne(tripId, userId);

      expect(result).toEqual(mockTrip);
      expect(mockTripsRepository.findOne).toHaveBeenCalledWith({
        where: { id: tripId },
        relations: ['owner', 'notes', 'notes.author'],
        order: {
          notes: {
            date: 'DESC',
            createdAt: 'DESC'
          }
        }
      });
    });

    it('should throw NotFoundException if trip does not exist', async () => {
      const tripId = 999;
      const userId = 1;

      mockTripsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(tripId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(tripId, userId)).rejects.toThrow(`Trip with ID ${tripId} not found`);
    });

    it('should throw ForbiddenException if user does not own the trip', async () => {
      const tripId = 1;
      const userId = 2; // Different user

      mockTripsRepository.findOne.mockResolvedValue(mockTrip);

      await expect(service.findOne(tripId, userId)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(tripId, userId)).rejects.toThrow('You do not have access to this trip');
    });
  });

  describe('findBySlug', () => {
    it('should return a trip by slug for the owner', async () => {
      const slug = 'test-trip';
      const userId = 1;

      mockTripsRepository.findOne.mockResolvedValue(mockTrip);

      const result = await service.findBySlug(slug, userId);

      expect(result).toEqual(mockTrip);
      expect(mockTripsRepository.findOne).toHaveBeenCalledWith({
        where: { slug },
        relations: ['owner', 'notes', 'notes.author'],
        order: {
          notes: {
            date: 'DESC',
            createdAt: 'DESC'
          }
        }
      });
    });

    it('should throw NotFoundException if trip does not exist', async () => {
      const slug = 'non-existent';
      const userId = 1;

      mockTripsRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug(slug, userId)).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug(slug, userId)).rejects.toThrow(`Trip with slug ${slug} not found`);
    });

    it('should throw ForbiddenException if user does not own the trip', async () => {
      const slug = 'test-trip';
      const userId = 2; // Different user

      mockTripsRepository.findOne.mockResolvedValue(mockTrip);

      await expect(service.findBySlug(slug, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a trip without media files', async () => {
      const tripId = 1;
      const userId = 1;
      const updateDto = { title: 'Updated Title' };

      mockTripsRepository.findOne
        .mockResolvedValueOnce(mockTrip) // First call in findOne
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' }); // Final fetch with relations

      mockQueryRunner.manager.save.mockResolvedValue({ ...mockTrip, title: 'Updated Title' });

      const result = await service.update(tripId, updateDto, userId);

      expect(result.title).toBe('Updated Title');
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should update a trip with media files', async () => {
      const tripId = 1;
      const userId = 1;
      const updateDto = {
        title: 'Updated Title',
        mediaFiles: [
          {
            key: 'trips/1/images/test.jpg',
            url: 'https://s3.amazonaws.com/test.jpg',
            type: 'image',
            originalName: 'test.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            order: 0,
          },
        ],
      };

      mockTripsRepository.findOne
        .mockResolvedValueOnce(mockTrip)
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' });

      mockQueryRunner.manager.save.mockResolvedValue({ ...mockTrip, title: 'Updated Title' });
      mockMediaFileRepository.create.mockReturnValue(updateDto.mediaFiles[0]);

      const result = await service.update(tripId, updateDto as any, userId);

      expect(mockMediaFileRepository.create).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(MediaFile, expect.any(Object));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const tripId = 1;
      const userId = 1;
      const updateDto = { title: 'Updated Title' };

      mockTripsRepository.findOne.mockResolvedValue(mockTrip);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.update(tripId, updateDto, userId)).rejects.toThrow('Database error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('updateBySlug', () => {
    it('should update a trip by slug', async () => {
      const slug = 'test-trip';
      const userId = 1;
      const updateDto = { title: 'Updated Title' };

      mockTripsRepository.findOne
        .mockResolvedValueOnce(mockTrip)
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' });

      mockQueryRunner.manager.save.mockResolvedValue({ ...mockTrip, title: 'Updated Title' });

      const result = await service.updateBySlug(slug, updateDto, userId);

      expect(result.title).toBe('Updated Title');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle media files when updating by slug', async () => {
      const slug = 'test-trip';
      const userId = 1;
      const updateDto = {
        title: 'Updated Title',
        mediaFiles: [
          {
            key: 'trips/1/videos/test.mp4',
            url: 'https://s3.amazonaws.com/test.mp4',
            type: 'video',
            originalName: 'test.mp4',
            mimeType: 'video/mp4',
            size: 10240,
            order: 0,
          },
        ],
      };

      mockTripsRepository.findOne
        .mockResolvedValueOnce(mockTrip)
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated Title' });

      mockQueryRunner.manager.save.mockResolvedValue({ ...mockTrip, title: 'Updated Title' });
      mockMediaFileRepository.create.mockReturnValue(updateDto.mediaFiles[0]);

      const result = await service.updateBySlug(slug, updateDto as any, userId);

      expect(mockMediaFileRepository.create).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a trip', async () => {
      const tripId = 1;
      const userId = 1;

      mockTripsRepository.findOne.mockResolvedValue(mockTrip);
      mockTripsRepository.remove.mockResolvedValue(mockTrip);

      await service.remove(tripId, userId);

      expect(mockTripsRepository.remove).toHaveBeenCalledWith(mockTrip);
    });

    it('should throw NotFoundException when removing non-existent trip', async () => {
      const tripId = 999;
      const userId = 1;

      mockTripsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(tripId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeBySlug', () => {
    it('should remove a trip by slug', async () => {
      const slug = 'test-trip';
      const userId = 1;

      mockTripsRepository.findOne.mockResolvedValue(mockTrip);
      mockTripsRepository.remove.mockResolvedValue(mockTrip);

      await service.removeBySlug(slug, userId);

      expect(mockTripsRepository.remove).toHaveBeenCalledWith(mockTrip);
    });
  });

  describe('findByStatus', () => {
    it('should return trips filtered by status', async () => {
      const userId = 1;
      const status = TripStatus.PLANNING;
      const trips = [mockTrip];

      mockTripsRepository.find.mockResolvedValue(trips);

      const result = await service.findByStatus(status, userId);

      expect(result).toEqual(trips);
      expect(mockTripsRepository.find).toHaveBeenCalledWith({
        where: { ownerId: userId, status: status },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findUpcoming', () => {
    it('should return upcoming trips', async () => {
      const userId = 1;
      const upcomingTrip = {
        ...mockTrip,
        startDate: new Date('2026-01-01'),
      };

      mockTripsRepository.find.mockResolvedValue([upcomingTrip]);

      const result = await service.findUpcoming(userId);

      expect(result).toEqual([upcomingTrip]);
      expect(mockTripsRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          ownerId: userId,
        }),
        order: { startDate: 'ASC' },
      });
    });
  });

  describe('processMediaFiles', () => {
    it('should process and save multiple media files', async () => {
      const mediaFiles = [
        {
          key: 'trips/1/images/img1.jpg',
          url: 'https://s3.amazonaws.com/img1.jpg',
          type: 'image',
          originalName: 'img1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          order: 0,
        },
        {
          key: 'trips/1/images/img2.jpg',
          url: 'https://s3.amazonaws.com/img2.jpg',
          type: 'image',
          originalName: 'img2.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          order: 1,
        },
      ];

      mockTripsRepository.findOne
        .mockResolvedValueOnce(mockTrip)
        .mockResolvedValueOnce({ ...mockTrip, title: 'Updated' });

      mockQueryRunner.manager.save.mockResolvedValue({});
      mockMediaFileRepository.create.mockImplementation((data) => data);

      await service.update(1, { mediaFiles } as any, 1);

      expect(mockMediaFileRepository.create).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(MediaFile, expect.objectContaining({
        key: 'trips/1/images/img1.jpg',
      }));
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(MediaFile, expect.objectContaining({
        key: 'trips/1/images/img2.jpg',
      }));
    });
  });
});
