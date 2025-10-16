import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { UsersService } from '../../users/application/users.service'; 
import { UpdateUserDto } from '../dto/update-user.dto';
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users.' })
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUser(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

 @Patch(':id')
@ApiOperation({ summary: 'Update user profile' })
@ApiResponse({ status: 200, description: 'User profile updated.' })
async updateUser(
  @Param('id') id: string,
  @Body() body: UpdateUserDto,
) {
  return this.usersService.updateUserProfile(id, body);
}
@Delete(':id')
@ApiOperation({ summary: 'Delete user by ID' })
@ApiResponse({ status: 200, description: 'User deleted successfully.' })
@ApiResponse({ status: 404, description: 'User not found.' })
async deleteUser(@Param('id') id: string) {
  return this.usersService.deleteUser(id);
}
}
