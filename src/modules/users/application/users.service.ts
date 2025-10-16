import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { User } from '../domain/user.entity';
import { TransactionService } from '../../../core/database/transaction.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from '../dto/update-user.dto';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly transactionService: TransactionService,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'createdAt', 'updatedAt'],
    });
  }


  async getUserById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }


 async updateUserProfile(userId: string, data: UpdateUserDto) {
  const user = await this.usersRepository.findOne({ where: { id: userId } });
  if (!user) throw new NotFoundException('User not found');

  if (data.email && data.email !== user.email) {
    const existing = await this.usersRepository.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already in use');
    user.email = data.email;
  }

  if (data.name) user.name = data.name;

  if (data.password) {
    const hashed = await bcrypt.hash(data.password, 10);
    user.password = hashed;
  }

  return this.usersRepository.save(user);
}

 async deleteUser(id: string): Promise<{ deleted: boolean }> {
  // Check if the user exists
  const user = await this.usersRepository.findOne({ where: { id } });
  if (!user) {
    throw new NotFoundException('User not found');
  }

  try {
    
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('User not found'); // just in case
    }

    return { deleted: true };
  } catch (error) {
    console.error('Error deleting user:', error);

    // If it is a foreign key / constraint error, give a more descriptive message
    if (error) { // PostgreSQL foreign key violation
      throw new BadRequestException(
        'Cannot delete user because related records exist'
      );
    }

    throw new InternalServerErrorException('Failed to delete user');
  }
}



 async create(data: Partial<User>): Promise<User> {
  if (!data.email || !data.password) {
    throw new BadRequestException('Email and password are required.');
  }

  // Ensure email uniqueness
  const existingUser = await this.usersRepository.findOne({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictException('User with this email already exists.');
  }

  // Use transaction for atomic operation
  return this.transactionService.execute(async (manager: EntityManager) => {
    const repo = manager.getRepository(User);

    // Hash password (safe since we validated existence above)
    const hashedPassword = await bcrypt.hash(data.password as string, 10);

    const user = repo.create({
      ...data,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await repo.save(user);
  });
}
  

async updateRefreshToken(userId: string, tokenEntry: { jti: string; hashedToken: string; createdAt: string; device?: string }): Promise<void> {
  await this.transactionService.execute(async (manager: EntityManager) => {
    const userRepo = manager.getRepository(User);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Initialize if empty
    user.refreshTokens = user.refreshTokens || [];

    // Replace existing token by same device/jti
    user.refreshTokens = user.refreshTokens.filter(t => t.jti !== tokenEntry.jti);
    user.refreshTokens.push(tokenEntry);

    user.updatedAt = new Date();
    await userRepo.save(user);
  });
}




  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }


  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }


  async addRefreshToken(
    userId: string,
    tokenEntry: { jti: string; hashedToken: string; createdAt: string; device?: string },
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const tokens = user.refreshTokens || [];
    tokens.push(tokenEntry);
    user.refreshTokens = tokens;

    await this.usersRepository.save(user);
  }


  async clearRefreshTokens(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.refreshTokens = [];
    await this.usersRepository.save(user);
  }

 
  async replaceRefreshToken(
    userId: string,
    oldJti: string,
    newEntry: { jti: string; hashedToken: string; createdAt: string; device?: string },
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.refreshTokens = (user.refreshTokens || []).filter(
      (t) => t.jti !== oldJti,
    );
    user.refreshTokens.push(newEntry);
    await this.usersRepository.save(user);
  }


  async removeRefreshToken(userId: string, jti: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.refreshTokens = (user.refreshTokens || []).filter(
      (t) => t.jti !== jti,
    );
    await this.usersRepository.save(user);
  }
}
