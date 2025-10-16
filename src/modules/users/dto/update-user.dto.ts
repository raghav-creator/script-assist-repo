
import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class UpdateUserDto {

  @ApiPropertyOptional({ description: 'User name ' })
  @IsOptional()
  @IsString()
  name?: string;
  
  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;
 
  
  
   @ApiPropertyOptional({ description: 'User password' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
