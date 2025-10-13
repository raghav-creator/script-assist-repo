
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // store array of { jti, hashedToken, createdAt, deviceInfo }
  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  refreshTokens: { jti: string; hashedToken: string; createdAt: string; device?: string }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
