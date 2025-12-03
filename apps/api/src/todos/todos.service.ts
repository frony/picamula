import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodoItem, TodoStatus } from './todo-item.entity';
import { CreateTodoItemDto, CreateBulkTodoItemsDto } from './create-todo-item.dto';
import { UpdateTodoItemDto } from './update-todo-item.dto';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(TodoItem)
    private todoItemsRepository: Repository<TodoItem>,
  ) {}

  async create(
    createDto: CreateTodoItemDto,
    userId: number,
  ): Promise<TodoItem> {
    const todoItem = this.todoItemsRepository.create({
      title: createDto.title,
      userId,
    });
    
    return await this.todoItemsRepository.save(todoItem);
  }

  async createBulk(
    createDto: CreateBulkTodoItemsDto,
    userId: number,
  ): Promise<TodoItem[]> {
    const todoItems = createDto.titles.map(title =>
      this.todoItemsRepository.create({
        title,
        userId,
      })
    );

    return await this.todoItemsRepository.save(todoItems);
  }

  async findAll(userId: number): Promise<TodoItem[]> {
    return await this.todoItemsRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number, userId: number): Promise<TodoItem> {
    const todoItem = await this.todoItemsRepository.findOne({
      where: { id, userId },
    });

    if (!todoItem) {
      throw new NotFoundException(`TODO item with ID ${id} not found`);
    }

    return todoItem;
  }

  async updateStatus(
    id: number,
    userId: number,
    updateDto: UpdateTodoItemDto,
  ): Promise<TodoItem> {
    const todoItem = await this.findOne(id, userId);
    todoItem.status = updateDto.status;
    return await this.todoItemsRepository.save(todoItem);
  }

  async toggleStatus(id: number, userId: number): Promise<TodoItem> {
    const todoItem = await this.findOne(id, userId);
    todoItem.status = todoItem.status === TodoStatus.PENDING 
      ? TodoStatus.COMPLETED 
      : TodoStatus.PENDING;
      
    return await this.todoItemsRepository.save(todoItem);
  }

  async remove(id: number, userId: number): Promise<void> {
    const todoItem = await this.findOne(id, userId);
    await this.todoItemsRepository.remove(todoItem);
  }

  async resetAll(userId: number): Promise<TodoItem[]> {
    const todoItems = await this.findAll(userId);
    
    todoItems.forEach(item => {
      item.status = TodoStatus.PENDING;
    });

    return await this.todoItemsRepository.save(todoItems);
  }
}
