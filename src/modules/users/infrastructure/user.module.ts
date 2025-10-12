import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/user.entity';
import { UserService } from '../application/user.service';
import { UserController } from './user.controller';
import { IUserRepository } from '../domain/user.repository';
import { TypeOrmUserRepository } from './typeorm-user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    UserService,
    { provide: IUserRepository, useClass: TypeOrmUserRepository },
  ],
  controllers: [UserController],
  exports: [UserService, IUserRepository],
})
export class UsersModule {}
