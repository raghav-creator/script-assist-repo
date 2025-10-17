import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { TasksService } from '../../tasks/application/tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ApiBadRequestResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Task } from '../domain/tasks.entity';
import { BatchTaskDto } from '../dto/batch-task.dto';
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TasksService) {}

@Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully', type: Task })
  async createTask(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.taskService.createTask(createTaskDto);
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
@ApiOperation({ summary: 'Update a task partially' })
@ApiResponse({ status: 200, description: 'Task updated successfully' })
async updateTask(
  @Param('id') id: string,
  @Body() updateTaskDto: UpdateTaskDto
) {
  return this.taskService.updateTask(id, updateTaskDto);
}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }
  
@Post('batch')
  @ApiOperation({ summary: 'Batch process tasks (complete or delete)' })
  @ApiResponse({ status: 200, description: 'Batch processed successfully' })
  async batchProcess(@Body() batchDto: BatchTaskDto) {
    const { taskIds, action } = batchDto;
    return this.taskService.batchProcess(taskIds, action);
  }
}
