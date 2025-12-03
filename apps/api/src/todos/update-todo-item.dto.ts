import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TodoStatus } from './todo-item.entity';

export class UpdateTodoItemDto {
  @ApiProperty({
    description: 'Status of the TODO item',
    enum: TodoStatus,
  })
  @IsEnum(TodoStatus)
  status: TodoStatus;
}
