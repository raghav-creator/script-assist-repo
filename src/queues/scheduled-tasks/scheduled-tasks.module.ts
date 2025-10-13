import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { OverdueTasksService } from './overdue-tasks.service';
import { TaskModule } from '../../modules/tasks/infrastructure/tasks.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'task-processing',
    }),
    TaskModule,
  ],
  providers: [OverdueTasksService],
  exports: [OverdueTasksService],
})
export class ScheduledTasksModule {} 