import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryRunner } from 'typeorm';
import { MediaController } from './media.controller';
import { FileSystemService } from '../filesystem/filesystem.service';
import { MediaFile } from './entities/media-file.entity';
import { Role } from '../users/enums/role.enum';

describe('MediaController', () => {
  let controller: MediaController;
  let fileSystemService: FileSystemService;
  let mediaFileRepository: any;

  const mockFileSystemService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  // Mock QueryRunner
  const mockQueryRunner: Partial<QueryRunner> = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      remove: jest.fn(),
    } as any,
  };

  const mockMediaFileRepository = {
    findOne: jest.fn(),
    manager: {
      connection: {
        createQueryRunner: jest.fn(() => mockQueryRunner),
      },
    },
  };

  const mockActiveUser = {
    sub: 1,
    email: 'test@example.com',
    role: Role.Regular,
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: FileSystemService,
          useValue: mockFileSystemService,
        },
        {
          provide: getRepositoryToken(MediaFile),
          useValue: mockMediaFileRepository,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    fileSystemService = module.get<FileSystemService>(FileSystemService);
    mediaFileRepository = module.get(getRepositoryToken(MediaFile));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    const mockImageFile = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File;

    const mockVideoFile = {
      fieldname: 'file',
      originalname: 'test-video.mp4',
      encoding: '7bit',
      mimetype: 'video/mp4',
      size: 10 * 1024 * 1024, // 10MB
      buffer: Buffer.from('fake-video-data'),
    } as Express.Multer.File;

    const mockFileSystemResponse = {
      key: 'trips/1/images/1234567890-test-image.jpg',
      url: 'http://localhost:8001/uploads/trips/1/images/1234567890-test-image.jpg',
    };

    it('should upload an image file successfully', async () => {
      mockFileSystemService.uploadFile.mockResolvedValue(mockFileSystemResponse);

      const result = await controller.uploadFile(1, mockImageFile, mockActiveUser);

      expect(result).toEqual({
        message: 'File uploaded successfully',
        key: mockFileSystemResponse.key,
        url: mockFileSystemResponse.url,
        type: 'image',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      expect(mockFileSystemService.uploadFile).toHaveBeenCalledWith(
        mockImageFile,
        expect.stringContaining('trips/1/images/'),
      );
    });

    it('should upload a video file successfully', async () => {
      mockFileSystemService.uploadFile.mockResolvedValue({
        ...mockFileSystemResponse,
        key: 'trips/1/videos/1234567890-test-video.mp4',
        url: 'http://localhost:8001/uploads/trips/1/videos/1234567890-test-video.mp4',
      });

      const result = await controller.uploadFile(1, mockVideoFile, mockActiveUser);

      expect(result).toEqual({
        message: 'File uploaded successfully',
        key: expect.stringContaining('trips/1/videos/'),
        url: expect.any(String),
        type: 'video',
        originalName: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 10 * 1024 * 1024,
      });

      expect(mockFileSystemService.uploadFile).toHaveBeenCalledWith(
        mockVideoFile,
        expect.stringContaining('trips/1/videos/'),
      );
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        controller.uploadFile(1, null as any, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockFileSystemService.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockImageFile,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      await expect(
        controller.uploadFile(1, invalidFile, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockFileSystemService.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when image exceeds size limit', async () => {
      const largeImageFile = {
        ...mockImageFile,
        size: 25 * 1024 * 1024, // 25MB (over 20MB limit)
      } as Express.Multer.File;

      await expect(
        controller.uploadFile(1, largeImageFile, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockFileSystemService.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when video exceeds size limit', async () => {
      const largeVideoFile = {
        ...mockVideoFile,
        size: 150 * 1024 * 1024, // 150MB (over 100MB limit)
      } as Express.Multer.File;

      await expect(
        controller.uploadFile(1, largeVideoFile, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockFileSystemService.uploadFile).not.toHaveBeenCalled();
    });

    it('should sanitize filename in file key', async () => {
      const fileWithSpecialChars = {
        ...mockImageFile,
        originalname: 'test image@2024!.jpg',
      } as Express.Multer.File;

      mockFileSystemService.uploadFile.mockResolvedValue(mockFileSystemResponse);

      await controller.uploadFile(1, fileWithSpecialChars, mockActiveUser);

      expect(mockFileSystemService.uploadFile).toHaveBeenCalledWith(
        fileWithSpecialChars,
        expect.stringMatching(/test_image_2024_.jpg$/),
      );
    });

    it('should generate unique file keys with timestamp', async () => {
      mockFileSystemService.uploadFile.mockResolvedValue(mockFileSystemResponse);

      const call1Promise = controller.uploadFile(1, mockImageFile, mockActiveUser);
      
      // Wait a tiny bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const call2Promise = controller.uploadFile(1, mockImageFile, mockActiveUser);

      await Promise.all([call1Promise, call2Promise]);

      const calls = mockFileSystemService.uploadFile.mock.calls;
      expect(calls[0][1]).not.toEqual(calls[1][1]);
    });

    it('should organize files by tripId and type in filesystem', async () => {
      mockFileSystemService.uploadFile.mockResolvedValue(mockFileSystemResponse);

      await controller.uploadFile(42, mockImageFile, mockActiveUser);

      expect(mockFileSystemService.uploadFile).toHaveBeenCalledWith(
        mockImageFile,
        expect.stringMatching(/^trips\/42\/images\//),
      );
    });
  });

  describe('deleteFile', () => {
    const mockMediaFile = {
      id: 1,
      key: 'trips/1/images/123456-test.jpg',
      url: 'http://localhost:8001/uploads/trips/1/images/123456-test.jpg',
      tripId: 1,
      trip: {
        id: 1,
        ownerId: 1,
      },
    };

    it('should delete a media file successfully', async () => {
      mockMediaFileRepository.findOne.mockResolvedValue(mockMediaFile);
      (mockQueryRunner.manager!.remove as jest.Mock).mockResolvedValue(mockMediaFile);
      mockFileSystemService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteFile(1, 1, mockActiveUser);

      expect(result).toEqual({ message: 'File deleted successfully' });
      expect(mockMediaFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, tripId: 1 },
        relations: ['trip'],
      });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager!.remove).toHaveBeenCalledWith(MediaFile, mockMediaFile);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(mockMediaFile.key);
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException when media file is not found', async () => {
      mockMediaFileRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.deleteFile(1, 999, mockActiveUser),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.deleteFile(1, 999, mockActiveUser),
      ).rejects.toThrow('Media file not found');

      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user does not own the trip', async () => {
      const mediaFileOwnedByOther = {
        ...mockMediaFile,
        trip: {
          id: 1,
          ownerId: 999, // Different owner
        },
      };
      mockMediaFileRepository.findOne.mockResolvedValue(mediaFileOwnedByOther);

      await expect(
        controller.deleteFile(1, 1, mockActiveUser),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.deleteFile(1, 1, mockActiveUser),
      ).rejects.toThrow('You do not have permission to delete this file');

      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });

    it('should still succeed when filesystem deletion fails', async () => {
      mockMediaFileRepository.findOne.mockResolvedValue(mockMediaFile);
      (mockQueryRunner.manager!.remove as jest.Mock).mockResolvedValue(mockMediaFile);
      mockFileSystemService.deleteFile.mockRejectedValue(new Error('Filesystem error'));

      // Spy on console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controller.deleteFile(1, 1, mockActiveUser);

      expect(result).toEqual({ message: 'File deleted successfully' });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete file'),
        expect.any(Error),
      );
      expect(mockQueryRunner.release).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should rollback transaction when database removal fails', async () => {
      mockMediaFileRepository.findOne.mockResolvedValue(mockMediaFile);
      (mockQueryRunner.manager!.remove as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        controller.deleteFile(1, 1, mockActiveUser),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockFileSystemService.deleteFile).not.toHaveBeenCalled();
    });

    it('should rollback transaction when commit fails', async () => {
      mockMediaFileRepository.findOne.mockResolvedValue(mockMediaFile);
      (mockQueryRunner.manager!.remove as jest.Mock).mockResolvedValue(mockMediaFile);
      (mockQueryRunner.commitTransaction as jest.Mock).mockRejectedValue(
        new Error('Commit failed'),
      );

      await expect(
        controller.deleteFile(1, 1, mockActiveUser),
      ).rejects.toThrow('Commit failed');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockFileSystemService.deleteFile).not.toHaveBeenCalled();
    });

    it('should release query runner even when an error occurs', async () => {
      mockMediaFileRepository.findOne.mockResolvedValue(mockMediaFile);
      (mockQueryRunner.manager!.remove as jest.Mock).mockRejectedValue(
        new Error('Some error'),
      );

      await expect(
        controller.deleteFile(1, 1, mockActiveUser),
      ).rejects.toThrow();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should use the correct file key for filesystem deletion', async () => {
      const mediaFileWithSpecificKey = {
        ...mockMediaFile,
        key: 'trips/42/videos/unique-video-key.mp4',
      };
      mockMediaFileRepository.findOne.mockResolvedValue(mediaFileWithSpecificKey);
      (mockQueryRunner.manager!.remove as jest.Mock).mockResolvedValue(mediaFileWithSpecificKey);
      mockFileSystemService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile(42, 1, mockActiveUser);

      expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(
        'trips/42/videos/unique-video-key.mp4',
      );
    });
  });
});
