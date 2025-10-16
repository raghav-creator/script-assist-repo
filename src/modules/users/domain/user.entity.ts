
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from './user-enum.role';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  
  @Column({ default: "test" })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

     
   @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  // store array of { jti, hashedToken, createdAt, deviceInfo }
  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  refreshTokens: { jti: string; hashedToken: string; createdAt: string; device?: string }[];

  @CreateDateColumn()
  createdAt: Date;


  @UpdateDateColumn()
  updatedAt: Date;
  tasks: any;

}
