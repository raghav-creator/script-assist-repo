import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Task } from '../../tasks/domain/tasks.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TransactionService } from '../../../core/database/transaction.service';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { CreateTaskDto } from '../dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
    private readonly transactionService: TransactionService,
  ) {}

  getTaskStatusEnum(): typeof TaskStatus {
    return TaskStatus;
  }

  async getTasks(query: {
    status?: TaskStatus;
    priority?: TaskPriority;
    page?: number;
    limit?: number;
  }): Promise<{ data: Task[]; total: number }> {
    const { status, priority, page = 1, limit = 10 } = query;

    const qb = this.tasksRepository.createQueryBuilder('task');

    if (status) qb.andWhere('task.status = :status', { status });
    if (priority) qb.andWhere('task.priority = :priority', { priority });

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  } 

  //  async createTask(data: CreateTaskDto): Promise<Task> {
  //   try {
  //     const createdTask = await this.transactionService.execute<Task>(async (manager: EntityManager) => {
  //       const taskRepo = manager.getRepository(Task);

  //       // Parse and validate dueDate
  //       let dueDate: Date | null = null;
  //       if (data.dueDate) {
  //         const parsed = new Date(data.dueDate);
  //         if (isNaN(parsed.getTime())) {
  //           throw new InternalServerErrorException('Invalid dueDate format');
  //         }
  //         dueDate = parsed;
  //       }

  //       // Create and save task
  //       const task = taskRepo.create({
  //         title: data.title.trim(),
  //         description: data.description ?? null,
  //         dueDate,
  //         status: data.status ?? TaskStatus.PENDING,
  //         priority: data.priority ?? TaskPriority.MEDIUM,
  //       });

  //       const saved = await taskRepo.save(task);

  //       // Add job to queue
  //       if (this.taskQueue) {
  //         await this.taskQueue.add('task-status-update', {
  //           taskId: saved.id,
  //           status: saved.status,
  //         });
  //       }

  //       return saved;
  //     });

  //     return createdTask;
  //   } catch (error) {
  //     console.error('Failed to create task:', error);
  //     throw new InternalServerErrorException('Failed to create task');
  //   }
  // }

  async createTask(data: CreateTaskDto): Promise<Task> {
  try {
    return await this.transactionService.execute(async (manager) => {
      const taskRepo = manager.getRepository(Task);

      let dueDate: Date | undefined;
      if (data.dueDate) {
        const parsed = new Date(data.dueDate);
        if (isNaN(parsed.getTime())) {
          throw new InternalServerErrorException('Invalid dueDate format');
        }
        dueDate = parsed;
      }

      const task = taskRepo.create({
        title: data.title.trim(),
        description: data.description ?? undefined,
        dueDate,
        status: data.status ?? TaskStatus.PENDING,
        priority: data.priority ?? TaskPriority.MEDIUM,
      });

      const savedTask = await taskRepo.save(task);

      if (this.taskQueue) {
        await this.taskQueue.add('task-status-update', {
          taskId: savedTask.id,
          status: savedTask.status,
        });
      }

      return savedTask;
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    throw new InternalServerErrorException('Failed to create task');
  }
}



  async getTaskById(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
  return this.transactionService.execute(async (manager: EntityManager) => {
    const taskRepo = manager.getRepository(Task);

    const task = await taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    // Only update provided fields
    Object.assign(task, data);

    try {
      return await taskRepo.save(task);
    } catch (err) {
      console.error('Error updating task:', err);
      throw new InternalServerErrorException('Failed to update task');
    }
  });
}

  async deleteTask(id: string): Promise<void> {
    await this.transactionService.execute(async (manager: EntityManager) => {
      const taskRepo = manager.getRepository(Task);
      const task = await taskRepo.findOne({ where: { id } });
      if (!task) throw new NotFoundException('Task not found');
      await taskRepo.remove(task);
    });
  }

 async batchProcess(
  taskIds: string[],
  action: 'complete' | 'delete',
): Promise<{ taskId: string; success: boolean; result?: any; error?: string }[]> {
  const results: { taskId: string; success: boolean; result?: any; error?: string }[] = [];

  for (const id of taskIds) {
    try {
      let result;
      switch (action) {
        case 'complete':
          // Update task status to COMPLETED
          result = await this.updateTask(id, { status: TaskStatus.COMPLETED });
          break;
        case 'delete':
          // Delete task
          await this.deleteTask(id);
          result = { deleted: true };
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      results.push({ taskId: id, success: true, result });
    } catch (err: any) {
      // Catch all errors for a task and continue
      console.error(`Error processing task ${id}:`, err);
      results.push({
        taskId: id,
        success: false,
        error: err.message || 'Unknown error',
      });
    }
  }

  return results;
}


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

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return this.tasksRepository.find({ where: { status } });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.getTaskById(id);
    task.status = status;
    return this.tasksRepository.save(task);
  }
}
