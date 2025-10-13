import { Controller, Get, Param, Post, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from '../../users/application/users.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() body: { name?: string }) {
    return this.userService.updateUserProfile(id, body.name);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
