import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../domain/task.entity';
import { TaskService } from '../application/task.service';
import { TypeOrmTaskRepository } from './typeorm-task.repository';
import { ITaskRepository } from '../domain/task.repository';
import { TaskController } from './task.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  providers: [
    TaskService,
    { provide: ITaskRepository, useClass: TypeOrmTaskRepository },
  ],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
