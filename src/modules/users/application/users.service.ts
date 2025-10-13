import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { User } from '../domain/user.entity';
import { TransactionService } from '../../../core/database/transaction.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  userRepository: any;
  async addRefreshToken(userId: string, tokenEntry: { jti: string; hashedToken: string; createdAt: string; device?: string }) {
    // ideally use query builder to perform append atomically
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException();
    const tokens = user.refreshTokens || [];
    tokens.push(tokenEntry);
    user.refreshTokens = tokens;
    await this.userRepository.save(user);
  }
  async clearRefreshTokens(userId: string) {
    await this.userRepository.updateRefreshToken(userId, null); // or set [] depending on schema
  }
  async replaceRefreshToken(userId: string, oldJti: string, newEntry: any) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException();
    user.refreshTokens = (user.refreshTokens || []).filter((t: { jti: string; }) => t.jti !== oldJti);
    user.refreshTokens.push(newEntry);
    await this.userRepository.save(user);
  }
  async removeRefreshToken(userId: string, jti: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException();
    user.refreshTokens = (user.refreshTokens || []).filter((t: { jti: string; }) => t.jti !== jti);
    await this.userRepository.save(user);
  }
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
