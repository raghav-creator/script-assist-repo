import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule  } from '@nestjs/bullmq';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from '../src/modules/users/infrastructure/users.module';
import { TaskModule } from '../src/modules/tasks/infrastructure/tasks.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { TaskProcessorModule } from './queues/task-processor/task-processor.module';
import { ScheduledTasksModule } from './queues/scheduled-tasks/scheduled-tasks.module';
import { CacheService } from './common/services/cache.service';
import { DatabaseModule } from "./core/database/database.module";
@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({ isGlobal: true }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<number>('DB_PORT')),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // Scheduling module
    ScheduleModule.forRoot(),

    // Queue module (BullMQ)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        isGlobal: true,
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: Number(config.get<number>('REDIS_PORT')),
        },
      }),
    }),

    // Rate limiting (Throttler)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        ttl: 60,
        limit: 10,
        
      }),
    }),
    UsersModule,
    TasksModule,
    AuthModule,
    TaskProcessorModule,
    ScheduledTasksModule,
    TerminusModule
  ],
  providers: [
    
    CacheService,
  ],
  exports: [
    
    CacheService,
  ],
})
export class AppModule {}
