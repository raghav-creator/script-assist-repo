import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/application/users.service';
import { JwtService } from '@nestjs/jwt';
import { TransactionService } from '../../../core/database/transaction.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly transactionService: TransactionService,
  ) {}

  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  async register(data: { email: string; password: string }) {
    return this.transactionService.execute(async () => {
      const user = await this.usersService.create(data);
      return this.generateTokens(user.id);
    });
  }

  async login(data: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user.id);
  }

  async refreshToken(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    // rotate token atomically
    return this.transactionService.execute(async () => {
      return this.generateTokens(user.id);
    });
  }

  private async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      { secret: process.env.JWT_SECRET, expiresIn: this.accessTokenExpiry },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: this.refreshTokenExpiry },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);

    return { accessToken, refreshToken };
  }
}
