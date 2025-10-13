import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Runs operations in a single database transaction.
   * Automatically rolls back on failure.
   */
  async execute<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      return work(manager);
    });
  }
}
