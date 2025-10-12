import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ nullable: true })
  hashedRefreshToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Domain logic (aggregate root methods)
  updateProfile(name: string) {
    this.name = name;
  }

  assignRole(role: UserRole) {
    this.role = role;
  }

  setHashedRefreshToken(hash: string) {
    this.hashedRefreshToken = hash;
  }

  clearRefreshToken() {
    this.hashedRefreshToken = null;
  }
}
