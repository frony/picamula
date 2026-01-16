import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from './entities/destination.entity';
import { DestinationService } from './destination.service';
import { DestinationController } from './destination.controller';
import { Trip } from '../trips/entities/trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Destination, Trip])],
  controllers: [DestinationController],
  providers: [DestinationService],
  exports: [TypeOrmModule, DestinationService],
})
export class DestinationModule { }
