import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripStatus } from './entities/trip.entity';

@ApiTags('Trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  @Post()
  create(@Body() createTripDto: CreateTripDto, @Request() req) {
    return this.tripsService.create(createTripDto, req.user.userId);
  }

  @ApiOperation({ summary: 'Get all user trips' })
  @ApiResponse({ status: 200, description: 'Trips retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, enum: TripStatus })
  @Get()
  findAll(@Request() req, @Query('status') status?: string) {
    if (status) {
      return this.tripsService.findByStatus(status, req.user.userId);
    }
    return this.tripsService.findAll(req.user.userId);
  }

  @ApiOperation({ summary: 'Get upcoming trips' })
  @ApiResponse({ status: 200, description: 'Upcoming trips retrieved successfully' })
  @Get('upcoming')
  findUpcoming(@Request() req) {
    return this.tripsService.findUpcoming(req.user.userId);
  }

  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiResponse({ status: 200, description: 'Trip retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.tripsService.findOne(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Update trip by ID' })
  @ApiResponse({ status: 200, description: 'Trip updated successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto, @Request() req) {
    return this.tripsService.update(id, updateTripDto, req.user.userId);
  }

  @ApiOperation({ summary: 'Delete trip by ID' })
  @ApiResponse({ status: 200, description: 'Trip deleted successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.tripsService.remove(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Add note to trip' })
  @ApiResponse({ status: 200, description: 'Note added successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() noteData: { content: string; date: string },
    @Request() req
  ) {
    return this.tripsService.addNote(id, noteData, req.user.userId);
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
    @Request() req
  ) {
    return this.tripsService.updateNote(id, parseInt(noteIndex), noteData, req.user.userId);
  }
}
