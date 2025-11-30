import {
  Controller,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Express } from 'express';
import { FileSystemService } from '../filesystem/filesystem.service';
import { MediaFile } from './entities/media-file.entity';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@ApiTags('Media')
@ApiBearerAuth('JWT-auth')
@Auth(AuthType.Bearer)
@Controller('trips/:tripId/media')
export class MediaController {
  constructor(
    private readonly fileSystemService: FileSystemService,
    @InjectRepository(MediaFile)
    private readonly mediaFileRepository: Repository<MediaFile>,
  ) {}

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

    // Generate file key
    const folder = isImage ? 'images' : 'videos';
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `trips/${tripId}/${folder}/${timestamp}-${sanitizedFilename}`;

    // Upload to filesystem
    const result = await this.fileSystemService.uploadFile(file, key);

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

  @ApiOperation({ summary: 'Delete a media file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @Delete(':mediaId')
  async deleteFile(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    // Find the media file
    const mediaFile = await this.mediaFileRepository.findOne({
      where: { id: mediaId, tripId },
      relations: ['trip'],
    });

    if (!mediaFile) {
      throw new BadRequestException('Media file not found');
    }

    // Check if user owns the trip
    if (mediaFile.trip.ownerId !== user.sub) {
      throw new BadRequestException('You do not have permission to delete this file');
    }

    // Store file key for deletion after DB transaction
    const fileKey = mediaFile.key;

    // Use transaction to ensure database consistency
    const queryRunner = this.mediaFileRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete from database first (within transaction)
      await queryRunner.manager.remove(MediaFile, mediaFile);
      
      // Commit transaction
      await queryRunner.commitTransaction();

      // After successful DB deletion, delete from filesystem (best effort)
      // If this fails, we'll have an orphaned file, but DB is consistent
      try {
        await this.fileSystemService.deleteFile(fileKey);
      } catch (fsError) {
        // Log filesystem deletion error but don't fail the request
        // since DB deletion was successful
        console.error(`Failed to delete file ${fileKey}:`, fsError);
      }

      return {
        message: 'File deleted successfully',
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }
}
