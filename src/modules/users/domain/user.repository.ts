import { User } from './user.entity';

export abstract class IUserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract save(user: User): Promise<User>;
  abstract updateRefreshToken(
    id: string,
    tokenEntry: { jti: string; hashedToken: string; createdAt: string; device?: string } | null
  ): Promise<void>;
}
