import { Module,forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/user.entity';
import { UsersService } from '../../users/application/users.service';
import { UsersController } from '../../users/infrastructure/users.controller';
import { IUserRepository } from '../domain/user.repository';
import { TypeOrmUserRepository } from './typeorm-user.repository';
import { DatabaseModule } from '../../../core/database/database.module';
import { AuthModule } from '../../auth/infrastructure/auth.module';
@Module({
  imports: [TypeOrmModule.forFeature([User]),forwardRef(() => AuthModule),DatabaseModule],
  providers: [
    UsersService,
    { provide: IUserRepository, useClass: TypeOrmUserRepository },
  ],
  controllers: [UsersController],
  exports: [UsersService, IUserRepository],
})
export class UsersModule {}
