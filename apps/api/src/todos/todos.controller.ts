import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TodosService } from './todos.service';
import { CreateTodoItemDto, CreateBulkTodoItemsDto } from './create-todo-item.dto';
import { UpdateTodoItemDto } from './update-todo-item.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

@ApiTags('Todos')
@ApiBearerAuth('JWT-auth')
@Auth(AuthType.Bearer)
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @ApiOperation({ summary: 'Create a TODO item' })
  @ApiResponse({ status: 201, description: 'TODO item created' })
  @Post()
  create(
    @Body() createDto: CreateTodoItemDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.todosService.create(createDto, user.sub);
  }

  @ApiOperation({ summary: 'Create multiple TODO items at once' })
  @ApiResponse({ status: 201, description: 'TODO items created' })
  @Post('bulk')
  createBulk(
    @Body() createDto: CreateBulkTodoItemsDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.todosService.createBulk(createDto, user.sub);
  }

  @ApiOperation({ summary: 'Get all TODO items' })
  @ApiResponse({ status: 200, description: 'TODO items retrieved' })
  @Get()
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.todosService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Reset all TODO items to PENDING' })
  @ApiResponse({ status: 200, description: 'All items reset to PENDING' })
  @Post('reset')
  resetAll(@ActiveUser() user: ActiveUserData) {
    return this.todosService.resetAll(user.sub);
  }

  @ApiOperation({ summary: 'Get a specific TODO item' })
  @ApiResponse({ status: 200, description: 'TODO item retrieved' })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.todosService.findOne(id, user.sub);
  }

  @ApiOperation({ summary: 'Update TODO status' })
  @ApiResponse({ status: 200, description: 'TODO status updated' })
  @Patch(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTodoItemDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.todosService.updateStatus(id, user.sub, updateDto);
  }

  @ApiOperation({ summary: 'Toggle TODO status between PENDING and COMPLETED' })
  @ApiResponse({ status: 200, description: 'TODO status toggled' })
  @Patch(':id/toggle')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.todosService.toggleStatus(id, user.sub);
  }

  @ApiOperation({ summary: 'Delete a TODO item' })
  @ApiResponse({ status: 200, description: 'TODO item deleted' })
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.todosService.remove(id, user.sub);
  }
}
