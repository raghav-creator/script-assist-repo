import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Task } from '../domain/tasks.entity';
import { ITaskRepository } from '../domain/tasks.repository';
import { TaskStatus } from '../enums/task-status.enum';

@Injectable()
export class TypeOrmTaskRepository implements ITaskRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  findById(id: string): Promise<Task | null> {
    return this.repo.findOne({ where: { id } });
  }

  findAll(options: any): Promise<Task[]> {
    return this.repo.find({ where: options });
  }

  save(task: Task): Promise<Task> {
    return this.repo.save(task);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findOverdueTasks(): Promise<Task[]> {
    return this.repo.find({
      where: { dueDate: LessThan(new Date()), status: TaskStatus.PENDING },
    });
  }
}
