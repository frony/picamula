import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TripExpensesService } from './trip-expenses.service';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { UpdateTripExpenseDto } from './dto/update-trip-expense.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@ApiTags('trip-expenses')
@ApiBearerAuth('JWT-auth')
@Auth(AuthType.Bearer)
@Controller('trip-expenses')
export class TripExpensesController {
  constructor(private readonly tripExpensesService: TripExpensesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new trip expense' })
  @ApiResponse({
    status: 201,
    description: 'The expense has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Trip or user not found.' })
  create(
    @Body() createTripExpenseDto: CreateTripExpenseDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tripExpensesService.create(createTripExpenseDto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expenses for a trip' })
  @ApiResponse({ status: 200, description: 'Return all trip expenses.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Trip not found.' })
  findAll(
    @Query('tripId', ParseIntPipe) tripId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tripExpensesService.findAll(tripId, user.sub);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get expenses summary for a trip' })
  @ApiResponse({ status: 200, description: 'Return trip expenses summary.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Trip not found.' })
  getSummary(
    @Query('tripId', ParseIntPipe) tripId: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tripExpensesService.getTripExpensesSummary(tripId, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific expense by ID' })
  @ApiResponse({ status: 200, description: 'Return the expense.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tripExpensesService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  @ApiResponse({
    status: 200,
    description: 'The expense has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTripExpenseDto: UpdateTripExpenseDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tripExpensesService.update(id, updateTripExpenseDto, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiResponse({
    status: 200,
    description: 'The expense has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tripExpensesService.remove(id, user.sub);
  }
}
