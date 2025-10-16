import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/application/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessExp = this.config.get('JWT_ACCESS_EXPIRY') || '15m';
  private refreshExp = this.config.get('JWT_REFRESH_EXPIRY') || '7d';
  private refreshHashRounds = Number(this.config.get('REFRESH_HASH_ROUNDS') || 12);

   signAccess(payload: any) {
    return this.jwtService.sign(payload, { secret: this.config.get('JWT_SECRET'), expiresIn: this.accessExp });
  }

    signRefresh(payload: any, jti: string) {
    return this.jwtService.sign({ ...payload, jti }, { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: this.refreshExp });
  }

  async generateTokensForUser(user: { id: any; email: any }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.signAccess(payload);

    const jti = uuidv4();
    const refreshToken = await this.signRefresh(payload, jti);
    const hashed = await bcrypt.hash(refreshToken, this.refreshHashRounds);

    await this.usersService.addRefreshToken(user.id, {
      jti,
      hashedToken: hashed,
      createdAt: new Date().toISOString(),
    });

    return { accessToken, refreshToken };
  }

  // ----------------- IMPLEMENTATIONS -----------------

  // LOGIN
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokensForUser({ id: user.id, email: user.email });
  }

  // REGISTER
  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(password, 10); // bcrypt salt rounds
    const user = await this.usersService.create({ email, password: hashedPassword, name });

    return this.generateTokensForUser({ id: user.id, email: user.email });
  }

  

async rotateRefresh(refreshToken: string) {
  let payload: any;
  try {
    payload = this.jwtService.verify(refreshToken, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });
  } catch {
    throw new UnauthorizedException('Invalid refresh token');
  }

  const { sub: userId, jti } = payload;
  const user = await this.usersService.findById(userId);
  if (!user) throw new UnauthorizedException('Invalid refresh token');

  const tokenEntry = (user.refreshTokens || []).find(t => t.jti === jti);
  if (!tokenEntry) {
    await this.usersService.clearRefreshTokens(userId);
    throw new UnauthorizedException('Refresh token reuse detected');
  }

  // Ensure hashedToken exists
  if (!tokenEntry.hashedToken) {
    await this.usersService.clearRefreshTokens(userId);
    throw new UnauthorizedException('Invalid refresh token');
  }

  const isValid = await bcrypt.compare(refreshToken, tokenEntry.hashedToken);
  if (!isValid) {
    await this.usersService.clearRefreshTokens(userId);
    throw new UnauthorizedException('Refresh token reuse detected');
  }

  // Generate new tokens
  const newJti = uuidv4();
  const newRefreshToken = this.signRefresh({ sub: userId, email: user.email }, newJti);
  const newHashedToken = await bcrypt.hash(newRefreshToken, this.refreshHashRounds);

  await this.usersService.replaceRefreshToken(userId, jti, {
    jti: newJti,
    hashedToken: newHashedToken,
    createdAt: new Date().toISOString(),
  });

  const accessToken = this.signAccess({ sub: userId, email: user.email });

  return { accessToken, refreshToken: newRefreshToken };
}



}
