import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Task } from '../../modules/tasks/domain/tasks.entity';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';

@Injectable()
export class OverdueTasksService {
  private readonly logger = new Logger(OverdueTasksService.name);

  constructor(
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks(): Promise<void> {
    this.logger.debug('Running overdue tasks check...');

    const now = new Date();

    
    const overdueTasks = await this.tasksRepository.find({
      where: {
        dueDate: LessThan(now),
        status: TaskStatus.PENDING,
      },
    });

    if (!overdueTasks.length) {
      this.logger.debug('No overdue tasks found');
      return;
    }

    this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

   
    for (const task of overdueTasks) {
      try {
        
        task.status = TaskStatus.OVERDUE;
        await this.tasksRepository.save(task);

    
        await this.taskQueue.add('overdue-task', {
          taskId: task.id,
          action: 'mark-overdue',
        });

        this.logger.debug(`Queued overdue task ID: ${task.id}`);
      } catch (error:any) {
        this.logger.error(
          `Failed to process overdue task ID: ${task.id}`,
          error.stack,
        );
      }
    }

    this.logger.debug('Overdue tasks check completed');
  }
}
