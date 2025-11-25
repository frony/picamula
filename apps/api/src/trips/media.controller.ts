import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Express } from 'express';
import { S3Service } from '../s3/s3.service';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@ApiTags('Media')
@ApiBearerAuth('JWT-auth')
@Auth(AuthType.Bearer)
@Controller('trips/:tripId/media')
export class MediaController {
  constructor(private readonly s3Service: S3Service) {}

  @ApiOperation({ summary: 'Upload media file (image or video) for a trip' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('tripId', ParseIntPipe) tripId: number,
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser() user: ActiveUserData,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new BadRequestException('Only images and videos are allowed');
    }

    // Validate file size - frontend compresses files before upload
    // These limits account for already-compressed files from the client
    const maxSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024; // 100MB for videos, 20MB for images
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      );
    }

    // Generate S3 key
    const folder = isImage ? 'images' : 'videos';
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `trips/${tripId}/${folder}/${timestamp}-${sanitizedFilename}`;

    // Upload to S3
    const result = await this.s3Service.uploadFile(file, key);

    return {
      message: 'File uploaded successfully',
      key: result.key,
      url: result.url,
      type: isImage ? 'image' : 'video',
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
