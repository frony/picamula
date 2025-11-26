import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { S3Service } from '../s3/s3.service';
import { Role } from '../users/enums/role.enum';

describe('MediaController', () => {
  let controller: MediaController;
  let s3Service: S3Service;

  const mockS3Service = {
    uploadFile: jest.fn(),
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
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    s3Service = module.get<S3Service>(S3Service);

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

    const mockS3Response = {
      key: 'trips/1/images/1234567890-test-image.jpg',
      url: 'https://bucket.s3.region.amazonaws.com/trips/1/images/1234567890-test-image.jpg',
      bucket: 'test-bucket',
    };

    it('should upload an image file successfully', async () => {
      mockS3Service.uploadFile.mockResolvedValue(mockS3Response);

      const result = await controller.uploadFile(1, mockImageFile, mockActiveUser);

      expect(result).toEqual({
        message: 'File uploaded successfully',
        key: mockS3Response.key,
        url: mockS3Response.url,
        type: 'image',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
      });

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        mockImageFile,
        expect.stringContaining('trips/1/images/'),
      );
    });

    it('should upload a video file successfully', async () => {
      mockS3Service.uploadFile.mockResolvedValue({
        ...mockS3Response,
        key: 'trips/1/videos/1234567890-test-video.mp4',
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

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        mockVideoFile,
        expect.stringContaining('trips/1/videos/'),
      );
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        controller.uploadFile(1, null as any, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockImageFile,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      await expect(
        controller.uploadFile(1, invalidFile, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when image exceeds size limit', async () => {
      const largeImageFile = {
        ...mockImageFile,
        size: 25 * 1024 * 1024, // 25MB (over 20MB limit)
      } as Express.Multer.File;

      await expect(
        controller.uploadFile(1, largeImageFile, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when video exceeds size limit', async () => {
      const largeVideoFile = {
        ...mockVideoFile,
        size: 150 * 1024 * 1024, // 150MB (over 100MB limit)
      } as Express.Multer.File;

      await expect(
        controller.uploadFile(1, largeVideoFile, mockActiveUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should sanitize filename in S3 key', async () => {
      const fileWithSpecialChars = {
        ...mockImageFile,
        originalname: 'test image@2024!.jpg',
      } as Express.Multer.File;

      mockS3Service.uploadFile.mockResolvedValue(mockS3Response);

      await controller.uploadFile(1, fileWithSpecialChars, mockActiveUser);

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        fileWithSpecialChars,
        expect.stringMatching(/test_image_2024_.jpg$/),
      );
    });

    it('should generate unique S3 keys with timestamp', async () => {
      mockS3Service.uploadFile.mockResolvedValue(mockS3Response);

      const call1Promise = controller.uploadFile(1, mockImageFile, mockActiveUser);
      
      // Wait a tiny bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const call2Promise = controller.uploadFile(1, mockImageFile, mockActiveUser);

      await Promise.all([call1Promise, call2Promise]);

      const calls = mockS3Service.uploadFile.mock.calls;
      expect(calls[0][1]).not.toEqual(calls[1][1]);
    });

    it('should organize files by tripId and type in S3', async () => {
      mockS3Service.uploadFile.mockResolvedValue(mockS3Response);

      await controller.uploadFile(42, mockImageFile, mockActiveUser);

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        mockImageFile,
        expect.stringMatching(/^trips\/42\/images\//),
      );
    });
  });
});
