import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../domain/user.repository';
import { User } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async createUser(email: string, password: string, name: string, role: UserRole = UserRole.USER): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = Object.assign(new User(), { email, password: hashedPassword, name, role });
    return this.userRepository.save(user);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    // In production, this should include pagination or filtering
    return (await this.userRepository['repo'].find()) as User[];
  }

  async updateUserProfile(id: string, name?: string) {
    const user = await this.getUserById(id);
    if (name) user.updateProfile(name);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository['repo'].delete(user.id);
  }

  async updateRefreshToken(userId: string, hashedToken: string | null): Promise<void> {
    await this.userRepository.updateRefreshToken(userId, hashedToken);
  }
}
