import { Task } from './tasks.entity';

export abstract class ITaskRepository {
  abstract findById(id: string): Promise<Task | null>;
  abstract findAll(options: any): Promise<Task[]>;
  abstract save(task: Task): Promise<Task>;
  abstract delete(id: string): Promise<void>;
  abstract findOverdueTasks(): Promise<Task[]>;
}