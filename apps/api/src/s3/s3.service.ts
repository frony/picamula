import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Express } from 'express';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-west-2';
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME');

    if (!this.bucketName) {
      throw new Error('AWS_BUCKET_NAME is not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.logger.log(`S3Service initialized with bucket: ${this.bucketName}, region: ${this.region}`);
  }

  /**
   * Upload a file from Multer to S3
   * @param file - Multer file object
   * @param key - S3 key (path) for the file
   * @returns Upload result with key, URL, and bucket name
   */
  async uploadFile(file: Express.Multer.File, key: string): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Removed ACL: 'public-read' - files are private by default
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      const response = await this.s3Client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
        
        this.logger.log(`File uploaded successfully: ${key}`);
        
        return {
          key,
          url,
          bucket: this.bucketName,
        };
      }

      throw new Error('Upload failed with status: ' + response.$metadata.httpStatusCode);
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error.stack);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }
}
