import { Module } from '@nestjs/common';
import { FileSystemService } from './filesystem.service';

@Module({
  providers: [FileSystemService],
  exports: [FileSystemService],
})
export class FileSystemModule {}
