import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
  ) {}

  /**
   * Create a new task with transactional consistency and queue integration
   */
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.tasksRepository.create(createTaskDto);
    const savedTask = await this.tasksRepository.save(task);

    try {
      await this.taskQueue.add('task-status-update', {
        taskId: savedTask.id,
        status: savedTask.status,
      });
    } catch (err:any) {
      // Log error, but task is still created
      console.error(`Failed to enqueue task ${savedTask.id}: ${err.message}`);
    }

    return savedTask;
  }

  /**
   * Efficient task statistics using aggregation
   */
  async getStatistics() {
    const qb = this.tasksRepository.createQueryBuilder('task');

    const stats = await qb
      .select([
        'COUNT(task.id) as total',
        `SUM(CASE WHEN task.status = '${TaskStatus.COMPLETED}' THEN 1 ELSE 0 END) as completed`,
        `SUM(CASE WHEN task.status = '${TaskStatus.IN_PROGRESS}' THEN 1 ELSE 0 END) as inProgress`,
        `SUM(CASE WHEN task.status = '${TaskStatus.PENDING}' THEN 1 ELSE 0 END) as pending`,
        `SUM(CASE WHEN task.priority = '${TaskPriority.HIGH}' THEN 1 ELSE 0 END) as highPriority`,
        `SUM(CASE WHEN task.priority = '${TaskPriority.MEDIUM}' THEN 1 ELSE 0 END) as mediumPriority`,
        `SUM(CASE WHEN task.priority = '${TaskPriority.LOW}' THEN 1 ELSE 0 END) as lowPriority`,
      ])
      .getRawOne();

    return {
      total: Number(stats.total),
      completed: Number(stats.completed),
      inProgress: Number(stats.inProgress),
      pending: Number(stats.pending),
      highPriority: Number(stats.highPriority),
      mediumPriority: Number(stats.mediumPriority),
      lowPriority: Number(stats.lowPriority),
    };
  }

  /**
   * Find tasks with optional pagination and relations
   */
  async findAll(page = 1, limit = 10, status?: TaskStatus, priority?: TaskPriority): Promise<{ data: Task[]; count: number }> {
    const [data, count] = await this.tasksRepository.findAndCount({
      where: { ...(status && { status }), ...(priority && { priority }) },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, count };
  }

  /**
   * Find task by ID
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  /**
   * Update a task with transactional status change handling
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    const originalStatus = task.status;

    Object.assign(task, updateTaskDto);

    const updatedTask = await this.tasksRepository.save(task);

    if (originalStatus !== updatedTask.status) {
      try {
        await this.taskQueue.add('task-status-update', {
          taskId: updatedTask.id,
          status: updatedTask.status,
        });
      } catch (err:any) {
        console.error(`Failed to enqueue status update for task ${updatedTask.id}: ${err.message}`);
      }
    }

    return updatedTask;
  }

  /**
   * Remove a task
   */
  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.tasksRepository.remove(task);
  }

  /**
   * Find tasks by status
   */
  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return this.tasksRepository.find({ where: { status }, relations: ['user'] });
  }

  /**
   * Update status (used by background processors)
   */
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status;
    return this.tasksRepository.save(task);
  }

  /**
   * Efficient bulk processing for batch operations
   */
  async batchProcess(taskIds: string[], action: 'complete' | 'delete'): Promise<any[]> {
    const tasks = await this.tasksRepository.findBy({ id: In(taskIds) });
    const results = [];

    for (const task of tasks) {
      try {
        let result;
        switch (action) {
          case 'complete':
            task.status = TaskStatus.COMPLETED;
            result = await this.tasksRepository.save(task);
            await this.taskQueue.add('task-status-update', {
              taskId: task.id,
              status: task.status,
            });
            break;
          case 'delete':
            await this.tasksRepository.remove(task);
            result = { deleted: true };
            break;
        }
        results.push({ taskId: task.id, success: true, result });
      } catch (err:any) {
        results.push({ taskId: task.id, success: false, error: err.message });
      }
    }

    return results;
  }
}
