import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.manager.transaction(async (manager) => {
      return await callback(manager);
    });
  }
}
