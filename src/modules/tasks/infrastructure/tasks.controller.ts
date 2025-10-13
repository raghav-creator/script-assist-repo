import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { TasksService } from '../../tasks/application/tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.taskService.getTasks(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.getTaskById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }
}
