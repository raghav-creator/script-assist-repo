import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskProcessorService } from './task-processor.service';
import { TaskModule } from '../../modules/tasks/infrastructure/tasks.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'task-processing',
    }),
    TaskModule,
  ],
  providers: [TaskProcessorService],
  exports: [TaskProcessorService],
})
export class TaskProcessorModule {} 