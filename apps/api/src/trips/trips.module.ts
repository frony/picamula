import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { MediaController } from './media.controller';
import { Trip } from './entities/trip.entity';
import { MediaFile } from './entities/media-file.entity';
import { NotesModule } from '../notes/notes.module';
import { FileSystemModule } from '../filesystem/filesystem.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, MediaFile]),
    NotesModule,
    FileSystemModule,
  ],
  controllers: [TripsController, MediaController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
