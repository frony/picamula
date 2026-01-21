import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@Auth(AuthType.Bearer)
@Controller('trips/:tripId/destinations')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  @Post()
  async create(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() createDestinationDto: CreateDestinationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.destinationService.create(tripId, createDestinationDto, user.sub);
  }

  @Get()
  async findAll(
    @Param('tripId', ParseIntPipe) tripId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.destinationService.findAllByTrip(tripId, user.sub);
  }

  @Patch(':id')
  async update(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateDestinationDto>,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.destinationService.update(id, tripId, updateData, user.sub);
  }

  @Delete(':id')
  async remove(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.destinationService.remove(id, tripId, user.sub);
  }

  @Post('reorder')
  async reorder(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() reorderData: { sourceId: number; targetId: number },
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.destinationService.reorder(tripId, reorderData.sourceId, reorderData.targetId, user.sub);
  }
}
