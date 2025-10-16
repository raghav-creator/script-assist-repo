import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ApiTags,ApiResponse, ApiOperation } from '@nestjs/swagger';
import { RefreshTokenDto } from './../dto/refresh-dto';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and return access & refresh tokens' })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and return access & refresh tokens' })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

   @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Returns new access and refresh tokens.' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.rotateRefresh(body.refreshToken);
  }
}
