import { Module, forwardRef  } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule,ConfigService  } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from '../../auth/application/auth.service';
import { UsersModule } from '../../users/infrastructure/users.module';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UsersModule),
     JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '3600s' },
      }),
    }),
    
  ],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy,JwtAuthGuard],
  exports: [AuthService,JwtAuthGuard,JwtModule],
})
export class AuthModule {}
