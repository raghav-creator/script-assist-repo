import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/user.entity';
import { UsersService } from '../../users/application/users.service';
import { UserController } from './users.controller';
import { IUserRepository } from '../domain/user.repository';
import { TypeOrmUserRepository } from './typeorm-user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    UsersService,
    { provide: IUserRepository, useClass: TypeOrmUserRepository },
  ],
  controllers: [UserController],
  exports: [UsersService, IUserRepository],
})
export class UsersModule {}
