import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../users/application/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/domain/user.entity';

@Injectable()
export class AuthService {
  private readonly refreshTokenExpiry: string;
  private readonly accessTokenExpiry: string;

  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshTokenExpiry = this.configService.get('JWT_REFRESH_EXPIRY') || '7d';
    this.accessTokenExpiry = this.configService.get('JWT_ACCESS_EXPIRY') || '15m';
  }

  /** Handle user login */
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  /** Handle user registration */
  async register(registerDto: RegisterDto) {
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) throw new ForbiddenException('Email already in use');

    const user = await this.usersService.createUser(registerDto.email, registerDto.password, registerDto.name);
    return this.generateTokens(user);
  }

  /** Handle refresh token rotation */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.getUserById(payload.sub);
      if (!user?.hashedRefreshToken) throw new UnauthorizedException('Invalid refresh token');

      const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
      if (!isValid) throw new UnauthorizedException('Invalid refresh token');

      return this.generateTokens(user);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /** Generate new access + refresh tokens and persist rotated refresh hash */
  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTokenExpiry,
    });

    // Rotate refresh token: hash + save
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTokenExpiry,
    };
  }

  /** Invalidate refresh token manually (e.g., logout) */
  async revokeRefreshToken(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }
}
