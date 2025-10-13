import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnQueueFailed, OnQueueActive } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TasksService } from '../../modules/tasks/application/tasks.service';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';

@Injectable()
@Processor('task-processing')
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(private readonly tasksService: TasksService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'task-status-update':
          return await this.handleStatusUpdate(job);
        case 'overdue-task':
          return await this.handleOverdueTasks(job);
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    } catch (error: any) {
      this.logger.error(
        `Error processing job ${job.id}: ${error.message || 'Unknown error'}`,
        error.stack,
      );
      throw error; // Allow BullMQ to handle retries
    }
  }

  private async handleStatusUpdate(job: Job) {
    const { taskId, status } = job.data as { taskId: string; status: TaskStatus };

    if (!taskId || !status) {
      this.logger.warn(`Job ${job.id} missing taskId or status`);
      return { success: false, error: 'Missing required data' };
    }

    // Validate status
    if (!Object.values(this.tasksService.getTaskStatusEnum()).includes(status)) {
      return { success: false, error: `Invalid status value: ${status}` };
    }

    try {
      const task = await this.tasksService.updateStatus(taskId, status);
      this.logger.log(`Task ${taskId} status updated to ${status}`);
      return { success: true, taskId: task.id, newStatus: task.status };
    } catch (err: any) {
      this.logger.error(`Failed to update status for task ${taskId}: ${err.message}`);
      throw err;
    }
  }

  private async handleOverdueTasks(job: Job) {
    this.logger.debug(`Processing overdue task job ${job.id}`);
    const { taskId } = job.data as { taskId: string };

    if (!taskId) {
      this.logger.warn(`Job ${job.id} missing taskId`);
      return { success: false, error: 'Missing taskId' };
    }

    try {
      const task = await this.tasksService.updateStatus(taskId, TaskStatus.OVERDUE);
      this.logger.log(`Task ${taskId} marked as OVERDUE`);
      return { success: true, taskId: task.id, newStatus: task.status };
    } catch (err: any) {
      this.logger.error(`Failed to process overdue task ${taskId}: ${err.message}`);
      throw err;
    }
  }

  @OnQueueFailed()
  onJobFailed(job: Job, error: Error) {
    this.logger.error(`Job failed ${job.id}: ${error.message}`, error.stack);
  }

  @OnQueueActive()
  onJobActive(job: Job) {
    this.logger.debug(`Job active ${job.id} of type ${job.name}`);
  }
}
