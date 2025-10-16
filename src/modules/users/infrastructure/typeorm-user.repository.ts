import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import { IUserRepository } from '../domain/user.repository';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async updateRefreshToken(
    id: string,
    tokenEntry: { jti: string; hashedToken: string; createdAt: string; device?: string } | null
  ): Promise<void> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  
    if (!user.refreshTokens) {
      user.refreshTokens = [];
    }
  
    if (tokenEntry) {
      // Add new token
      user.refreshTokens.push(tokenEntry);
    } else {
      // Clear all tokens
      user.refreshTokens = [];
    }
  
    user.updatedAt = new Date();
  
    await this.repo.save(user);
  }
  
}
