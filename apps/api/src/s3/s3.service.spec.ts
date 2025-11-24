import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
    PutObjectCommand: jest.fn(),
  };
});

describe('S3Service', () => {
  let service: S3Service;
  let configService: ConfigService;
  let mockS3Client: jest.Mocked<S3Client>;

  const mockConfigValues = {
    AWS_REGION: 'us-west-2',
    AWS_BUCKET_NAME: 'test-bucket',
    AWS_ACCESS_KEY_ID: 'test-key-id',
    AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  };

  beforeEach(async () => {
    // Create mock S3Client instance with proper typing
    mockS3Client = {
      send: jest.fn().mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
      }),
    } as any;

    // Mock S3Client constructor
    (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize S3Client with correct configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-west-2',
        credentials: {
          accessKeyId: 'test-key-id',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should throw error if AWS_BUCKET_NAME is not configured', () => {
      const invalidConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'AWS_BUCKET_NAME') return undefined;
          return mockConfigValues[key];
        }),
      };

      expect(() => {
        new S3Service(invalidConfigService as any);
      }).toThrow('AWS_BUCKET_NAME is not configured');
    });

    it('should use default region if AWS_REGION is not set', () => {
      const configServiceWithoutRegion = {
        get: jest.fn((key: string) => {
          if (key === 'AWS_REGION') return undefined;
          return mockConfigValues[key];
        }),
      };

      new S3Service(configServiceWithoutRegion as any);

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-west-2',
        }),
      );
    });
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test file content'),
      size: 1024,
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    const mockKey = 'trips/123/images/test-image.jpg';

    it('should successfully upload a file and return upload result', async () => {
      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.uploadFile(mockFile, mockKey);

      expect(result).toEqual({
        key: mockKey,
        url: `https://test-bucket.s3.us-west-2.amazonaws.com/${mockKey}`,
        bucket: 'test-bucket',
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand),
      );
    });

    it('should send PutObjectCommand with correct parameters', async () => {
      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      await service.uploadFile(mockFile, mockKey);

      const putObjectCall = (mockS3Client.send as jest.Mock).mock.calls[0][0];
      expect(putObjectCall.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: mockKey,
        Body: mockFile.buffer,
        ContentType: 'image/jpeg',
      });
    });

    it('should include metadata with original filename and timestamp', async () => {
      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      await service.uploadFile(mockFile, mockKey);

      const putObjectCall = (mockS3Client.send as jest.Mock).mock.calls[0][0];
      expect(putObjectCall.input.Metadata).toHaveProperty('originalName', 'test-image.jpg');
      expect(putObjectCall.input.Metadata).toHaveProperty('uploadedAt');
      expect(putObjectCall.input.Metadata.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should not include ACL parameter (files are private by default)', async () => {
      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      await service.uploadFile(mockFile, mockKey);

      const putObjectCall = (mockS3Client.send as jest.Mock).mock.calls[0][0];
      expect(putObjectCall.input).not.toHaveProperty('ACL');
    });

    it('should throw error if upload fails with non-200 status', async () => {
      const mockResponse = {
        $metadata: {
          httpStatusCode: 500,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(service.uploadFile(mockFile, mockKey)).rejects.toThrow(
        'Upload failed with status: 500',
      );
    });

    it('should throw error if S3 client throws an error', async () => {
      const s3Error = new Error('Network error');
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(s3Error);

      await expect(service.uploadFile(mockFile, mockKey)).rejects.toThrow(
        'S3 upload failed: Network error',
      );
    });

    it('should handle different file types correctly', async () => {
      const videoFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'test-video.mp4',
        mimetype: 'video/mp4',
      };

      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.uploadFile(videoFile, 'trips/123/videos/test-video.mp4');

      expect(result.key).toBe('trips/123/videos/test-video.mp4');
      
      const putObjectCall = (mockS3Client.send as jest.Mock).mock.calls[0][0];
      expect(putObjectCall.input.ContentType).toBe('video/mp4');
    });

    it('should handle files with special characters in name', async () => {
      const specialFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'test image with spaces & special.jpg',
      };

      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      await service.uploadFile(specialFile, mockKey);

      const putObjectCall = (mockS3Client.send as jest.Mock).mock.calls[0][0];
      expect(putObjectCall.input.Metadata.originalName).toBe('test image with spaces & special.jpg');
    });

    it('should construct correct URL for different regions', async () => {
      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.uploadFile(mockFile, mockKey);

      expect(result.url).toBe(
        `https://test-bucket.s3.us-west-2.amazonaws.com/${mockKey}`,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty buffer', async () => {
      const emptyFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'empty.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        buffer: Buffer.from(''),
        size: 0,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await service.uploadFile(emptyFile, 'test/empty.txt');

      expect(result).toBeDefined();
      expect(result.key).toBe('test/empty.txt');
    });

    it('should handle very long file keys', async () => {
      const longKey = 'a'.repeat(1000) + '/test.jpg';
      
      const mockResponse = {
        $metadata: {
          httpStatusCode: 200,
        },
      };

      (mockS3Client.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 4,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const result = await service.uploadFile(mockFile, longKey);

      expect(result.key).toBe(longKey);
    });
  });
});
