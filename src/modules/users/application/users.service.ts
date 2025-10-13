import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { User } from '../domain/user.entity';
import { TransactionService } from '../../../core/database/transaction.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly transactionService: TransactionService,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    return this.transactionService.execute(async (manager: EntityManager) => {
      const repo = manager.getRepository(User);

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = repo.create({ ...data, password: hashedPassword });
      return repo.save(user);
    });
  }

  async updateRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await this.transactionService.execute(async (manager) => {
      await manager.getRepository(User).update(userId, {
        hashedRefreshToken: hashedToken,
      });
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
