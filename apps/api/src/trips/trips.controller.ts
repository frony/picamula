import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripStatus } from './entities/trip.entity';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@ApiTags('Trips')
@ApiBearerAuth()
@Auth(AuthType.Bearer)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  @Post()
  create(@Body() createTripDto: CreateTripDto, @ActiveUser() user: ActiveUserData) {
    return this.tripsService.create(createTripDto, user.sub);
  }

  @ApiOperation({ summary: 'Get all user trips' })
  @ApiResponse({ status: 200, description: 'Trips retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, enum: TripStatus })
  @Get()
  findAll(@ActiveUser() user: ActiveUserData, @Query('status') status?: string) {
    if (status) {
      return this.tripsService.findByStatus(status, user.sub);
    }
    return this.tripsService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Get upcoming trips' })
  @ApiResponse({ status: 200, description: 'Upcoming trips retrieved successfully' })
  @Get('upcoming')
  findUpcoming(@ActiveUser() user: ActiveUserData) {
    return this.tripsService.findUpcoming(user.sub);
  }

  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiResponse({ status: 200, description: 'Trip retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Get(':id')
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.tripsService.findOne(id, user.sub);
  }

  @ApiOperation({ summary: 'Update trip by ID' })
  @ApiResponse({ status: 200, description: 'Trip updated successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto, @ActiveUser() user: ActiveUserData) {
    return this.tripsService.update(id, updateTripDto, user.sub);
  }

  @ApiOperation({ summary: 'Delete trip by ID' })
  @ApiResponse({ status: 200, description: 'Trip deleted successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Delete(':id')
  remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.tripsService.remove(id, user.sub);
  }

  @ApiOperation({ summary: 'Add note to trip' })
  @ApiResponse({ status: 200, description: 'Note added successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() noteData: { content: string; date: string },
    @ActiveUser() user: ActiveUserData
  ) {
    return this.tripsService.addNote(id, noteData, user.sub);
  }

  @ApiOperation({ summary: 'Update note in trip' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  @ApiResponse({ status: 404, description: 'Trip or note not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Patch(':id/notes/:noteIndex')
  updateNote(
    @Param('id') id: string,
    @Param('noteIndex') noteIndex: string,
    @Body() noteData: { content: string; date: string },
    @ActiveUser() user: ActiveUserData
  ) {
    return this.tripsService.updateNote(id, parseInt(noteIndex), noteData, user.sub);
  }
}
