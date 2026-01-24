import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from './entities/note.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Destination } from '../destination/entities/destination.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Note, Trip, Destination])],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
