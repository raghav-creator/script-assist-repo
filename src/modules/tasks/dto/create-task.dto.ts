import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum'; // your enum for task statuses

export class CreateTaskDto {
  @ApiProperty({ description: 'Title of the task' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the task', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Due date of the task in ISO 8601 format', required: false })
  @IsOptional()
  @IsDateString() // validates ISO 8601 date string
  dueDate?: string;

  @ApiProperty({ description: 'Status of the task', enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
