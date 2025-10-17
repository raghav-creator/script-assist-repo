import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../tasks/domain/tasks.entity';
import { TasksService } from '../../tasks/application/tasks.service';
import { TypeOrmTaskRepository } from './typeorm-task.repository';
import { ITaskRepository } from '../../tasks/domain/tasks.repository';
import { TaskController } from '../../tasks/infrastructure/tasks.controller';
import { BullModule } from '@nestjs/bullmq';
import { TransactionService } from 'src/core/database/transaction.service';
@Module({
  imports: [TypeOrmModule.forFeature([Task]), BullModule.registerQueue({
      name: 'task-processing', 
    }),],
  providers: [
    TasksService,
    TransactionService,
    { provide: ITaskRepository, useClass: TypeOrmTaskRepository },
  ],
  controllers: [TaskController],
  exports: [TasksService],
})
export class TaskModule {}
