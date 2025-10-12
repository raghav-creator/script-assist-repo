import { Injectable, NotFoundException } from '@nestjs/common';
import { ITaskRepository } from '../domain/tasks.repository';
import { Task } from '../domain/tasks.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const task = Object.assign(new Task(), dto);
    return this.taskRepository.save(task);
  }

  async getTasks(filter: any): Promise<Task[]> {
    return this.taskRepository.findAll(filter);
  }

  async getTaskById(id: string): Promise<Task> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.getTaskById(id);
    Object.assign(task, dto);
    return this.taskRepository.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    const task = await this.getTaskById(id);
    await this.taskRepository.delete(task.id);
  }

  async checkOverdueTasks() {
    const overdue = await this.taskRepository.findOverdueTasks();
    for (const task of overdue) {
      task.markAsOverdue();
      await this.taskRepository.save(task);
    }
    return overdue.length;
  }
}
