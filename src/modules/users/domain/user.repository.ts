import { User } from './user.entity';

export abstract class IUserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract save(user: User): Promise<User>;
  abstract updateRefreshToken(id: string, hashedToken: string | null): Promise<void>;
}
