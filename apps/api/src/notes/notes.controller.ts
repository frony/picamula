import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
@Controller('trips/:tripId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @ApiOperation({ summary: 'Create a new note for a trip' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Post()
  create(
    @Param('tripId') tripId: string,
    @Body() createNoteDto: CreateNoteDto,
    @ActiveUser() user: ActiveUserData
  ) {
    return this.notesService.create(tripId, createNoteDto, user.sub);
  }

  @ApiOperation({ summary: 'Get all notes for a trip' })
  @ApiResponse({ status: 200, description: 'Notes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Get()
  findAll(
    @Param('tripId') tripId: string,
    @ActiveUser() user: ActiveUserData
  ) {
    return this.notesService.findAllByTrip(tripId, user.sub);
  }

  @ApiOperation({ summary: 'Get a specific note' })
  @ApiResponse({ status: 200, description: 'Note retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData
  ) {
    return this.notesService.findOne(id, user.sub);
  }

  @ApiOperation({ summary: 'Update a note' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @ActiveUser() user: ActiveUserData
  ) {
    return this.notesService.update(id, updateNoteDto, user.sub);
  }

  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData
  ) {
    return this.notesService.remove(id, user.sub);
  }
}
