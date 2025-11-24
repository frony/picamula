import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { MediaFileType } from '../entities/media-file.entity';

export class CreateMediaFileDto {
  @ApiProperty({
    example: 'trips/123/images/photo.jpg',
    description: 'S3 key for the media file',
  })
  @IsString()
  key: string;

  @ApiProperty({
    example: 'https://bucket-name.s3.amazonaws.com/trips/123/images/photo.jpg',
    description: 'Full S3 URL for the media file',
  })
  @IsString()
  url: string;

  @ApiProperty({
    example: MediaFileType.IMAGE,
    description: 'Type of media file',
    enum: MediaFileType,
  })
  @IsEnum(MediaFileType)
  type: MediaFileType;

  @ApiProperty({
    example: 'vacation-photo.jpg',
    description: 'Original filename',
    required: false,
  })
  @IsString()
  @IsOptional()
  originalName?: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type of the file',
    required: false,
  })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({
    example: 1024000,
    description: 'File size in bytes',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  size?: number;

  @ApiProperty({
    example: 0,
    description: 'Order/position for displaying media',
    required: false,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number;

  @ApiProperty({
    example: 1920,
    description: 'Image width in pixels',
    required: false,
  })
  @IsInt()
  @IsOptional()
  width?: number;

  @ApiProperty({
    example: 1080,
    description: 'Image height in pixels',
    required: false,
  })
  @IsInt()
  @IsOptional()
  height?: number;

  @ApiProperty({
    example: 120,
    description: 'Video duration in seconds',
    required: false,
  })
  @IsInt()
  @IsOptional()
  duration?: number;

  @ApiProperty({
    example: 'trips/123/thumbnails/video-thumb.jpg',
    description: 'S3 key for video thumbnail',
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnailKey?: string;
}
