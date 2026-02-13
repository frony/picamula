import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@Auth(AuthType.Bearer)
@Controller('trips')
export class DestinationController {
  private readonly logger = new Logger(DestinationController.name);
  constructor(private readonly destinationService: DestinationService) { }

  @Post(':tripId/destinations')
  async create(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() createDestinationDto: CreateDestinationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    try {
      return await this.destinationService.create(tripId, createDestinationDto, user.sub);
    } catch (error) {
      this.logger.error(`Error creating destination for trip ${tripId}:`, error);
      throw error;
    }
  }

  @Get(':tripId/destinations')
  async findAll(
    @Param('tripId', ParseIntPipe) tripId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    try {
      return await this.destinationService.findAllByTrip(tripId, user.sub);
    } catch (error) {
      this.logger.error(`Error finding all destinations for trip ${tripId}:`, error);
      throw error;
    }
  }

  @Get('by-slug/:tripSlug/destinations')
  async findAllBySlug(
    @Param('tripSlug') tripSlug: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    try {
      return await this.destinationService.findAllByTripSlug(tripSlug, user.sub);
    } catch (error) {
      this.logger.error(`Error finding all destinations for trip ${tripSlug}:`, error);
      throw error;
    }
  }

  @Patch(':tripId/destinations/:id')
  async update(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateDestinationDto>,
    @ActiveUser() user: ActiveUserData,
  ) {
    try {
      return await this.destinationService.update(id, tripId, updateData, user.sub);
    } catch (error) {
      this.logger.error(`Error updating destination ${id} for trip ${tripId}:`, error);
      throw error;
    }
  }

  @Delete(':tripId/destinations/:id')
  async remove(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    try {
      return await this.destinationService.remove(id, tripId, user.sub);
    } catch (error) {
      this.logger.error(`Error removing destination ${id} for trip ${tripId}:`, error);
      throw error;
    }
  }

  @Post(':tripId/destinations/reorder')
  async reorder(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() reorderData: { sourceId: number; targetId: number },
    @ActiveUser() user: ActiveUserData,
  ) {
    try {
      return await this.destinationService.reorder(tripId, reorderData.sourceId, reorderData.targetId, user.sub);
    } catch (error) {
      this.logger.error(`Error reordering destinations for trip ${tripId}:`, error);
      throw error;
    }
  }
}
