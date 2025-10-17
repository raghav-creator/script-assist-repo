// src/modules/tasks/dto/batch-task.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsString, IsIn } from 'class-validator';

export class BatchTaskDto {
  @ApiProperty({ type: [String], description: 'Array of task IDs to process' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  taskIds: string[];

  @ApiProperty({ enum: ['complete', 'delete'], description: 'Action to perform' })
  @IsString()
  @IsIn(['complete', 'delete'])
  action: 'complete' | 'delete';
}
