import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { MediaController } from './media.controller';
import { Trip } from './entities/trip.entity';
import { MediaFile } from './entities/media-file.entity';
import { NotesModule } from '../notes/notes.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, MediaFile]),
    NotesModule,
    S3Module,
  ],
  controllers: [TripsController, MediaController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
