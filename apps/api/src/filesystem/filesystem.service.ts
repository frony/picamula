import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Express } from 'express';

export interface UploadResult {
  key: string;
  url: string;
  path: string;
}

@Injectable()
export class FileSystemService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(FileSystemService.name);

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR');
    this.baseUrl = this.configService.get<string>('UPLOAD_BASE_URL');

    if (!this.uploadDir) {
      throw new Error('UPLOAD_DIR is not configured');
    }

    if (!this.baseUrl) {
      throw new Error('UPLOAD_BASE_URL is not configured');
    }

    this.logger.log(`FileSystemService initialized with upload dir: ${this.uploadDir}`);
    this.logger.log(`Base URL: ${this.baseUrl}`);
  }

  /**
   * Upload a file from Multer to local filesystem
   * @param file - Multer file object
   * @param key - Relative path for the file (e.g., trips/1/images/123-photo.jpg)
   * @returns Upload result with key, URL, and full path
   */
  async uploadFile(file: Express.Multer.File, key: string): Promise<UploadResult> {
    try {
      const fullPath = join(this.uploadDir, key);
      const directory = fullPath.substring(0, fullPath.lastIndexOf('/'));

      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Write file to disk
      await fs.writeFile(fullPath, file.buffer);

      const url = `${this.baseUrl}/${key}`;

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        path: fullPath,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error.stack);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from local filesystem
   * @param key - Relative path of the file to delete
   * @returns True if deletion was successful
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const fullPath = join(this.uploadDir, key);

      // Check if file exists
      await fs.access(fullPath);

      // Delete file
      await fs.unlink(fullPath);

      this.logger.log(`File deleted successfully: ${key}`);

      // Try to delete empty parent directories (optional cleanup)
      await this.cleanupEmptyDirectories(fullPath);

      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`File not found: ${key}`);
        return true; // File doesn't exist, consider it deleted
      }
      this.logger.error(`Failed to delete file: ${key}`, error.stack);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Clean up empty parent directories after file deletion
   * @param filePath - Full path of the deleted file
   */
  private async cleanupEmptyDirectories(filePath: string): Promise<void> {
    try {
      let directory = filePath.substring(0, filePath.lastIndexOf('/'));

      // Don't delete the base upload directory
      while (directory !== this.uploadDir && directory.startsWith(this.uploadDir)) {
        const files = await fs.readdir(directory);
        
        if (files.length === 0) {
          await fs.rmdir(directory);
          this.logger.log(`Removed empty directory: ${directory}`);
          directory = directory.substring(0, directory.lastIndexOf('/'));
        } else {
          break; // Directory not empty, stop cleanup
        }
      }
    } catch (error) {
      // Ignore errors during cleanup
      this.logger.warn(`Error during directory cleanup: ${error.message}`);
    }
  }
}
