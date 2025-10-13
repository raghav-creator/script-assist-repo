import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Task } from '../../tasks/domain/tasks.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TransactionService } from '../../../core/database/transaction.service';

@Injectable()
export class TasksService {
  getTaskStatusEnum(): { [s: string]: unknown; } | ArrayLike<unknown> {
    throw new Error('Method not implemented.');
  }
  updateStatus(taskId: string, status: TaskStatus) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
    private readonly transactionService: TransactionService,
  ) {}

  async create(data: Partial<Task>): Promise<Task> {
    return this.transactionService.execute(async (manager: EntityManager) => {
      const taskRepo = manager.getRepository(Task);
      const task = taskRepo.create(data);
      const savedTask = await taskRepo.save(task);

      // enqueue async job after commit
      await this.taskQueue.add('task-status-update', {
        taskId: savedTask.id,
        status: savedTask.status,
      });

      return savedTask;
    });
  }

  async update(id: string, updateData: Partial<Task>): Promise<Task> {
    return this.transactionService.execute(async (manager) => {
      const taskRepo = manager.getRepository(Task);
      const task = await taskRepo.findOneBy({ id });
      if (!task) throw new NotFoundException('Task not found');
      


      Object.assign(task, updateData);
      const updated = await taskRepo.save(task);

      if (updateData.status) {
        await this.taskQueue.add('task-status-update', {
          taskId: updated.id,
          status: updated.status,
        });
      }

      return updated;
    });
  }

  async remove(id: string): Promise<void> {
    await this.transactionService.execute(async (manager) => {
      const taskRepo = manager.getRepository(Task);
      const task = await taskRepo.findOneBy({ id });
      if (!task) throw new NotFoundException('Task not found');
      await taskRepo.remove(task);
    });
  }
}
