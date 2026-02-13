import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@ApiTags('Notes')
@ApiBearerAuth('JWT-auth')
@Auth(AuthType.Bearer)
@Controller('trips/:tripSlug/notes')
export class NotesController {
  private readonly logger = new Logger(NotesController.name);

  constructor(private readonly notesService: NotesService) {}

  @ApiOperation({ summary: 'Create a new note for a trip' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Post()
  async create(
    @Param('tripSlug') tripSlug: string,
    @Body() createNoteDto: CreateNoteDto,
    @ActiveUser() user: ActiveUserData
  ) {
    try {
      return await this.notesService.create(tripSlug, createNoteDto, user.sub);
    } catch (error) {
      this.logger.error(`Error creating note for trip ${tripSlug}:`, error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get all notes for a trip' })
  @ApiResponse({ status: 200, description: 'Notes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Get()
  async findAll(
    @Param('tripSlug') tripSlug: string,
    @ActiveUser() user: ActiveUserData
  ) {
    try {
      return await this.notesService.findAllByTrip(tripSlug, user.sub);
    } catch (error) {
      this.logger.error(`Error finding notes for trip ${tripSlug}:`, error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get a specific note' })
  @ApiResponse({ status: 200, description: 'Note retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData
  ) {
    try {
      return await this.notesService.findOne(id, user.sub);
    } catch (error) {
      this.logger.error(`Error finding note ${id}:`, error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Update a note' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @ActiveUser() user: ActiveUserData
  ) {
    try {
      return await this.notesService.update(id, updateNoteDto, user.sub);
    } catch (error) {
      this.logger.error(`Error updating note ${id}:`, error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData
  ) {
    try {
      return await this.notesService.remove(id, user.sub);
    } catch (error) {
      this.logger.error(`Error removing note ${id}:`, error);
      throw error;
    }
  }
}
