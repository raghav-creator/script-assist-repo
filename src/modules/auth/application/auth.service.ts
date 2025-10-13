// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/application/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

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

  private signAccess(payload: any) {
    return this.jwtService.sign(payload, { secret: this.config.get('JWT_SECRET'), expiresIn: this.accessExp });
  }

  private signRefresh(payload: any, jti: string) {
    return this.jwtService.sign({ ...payload, jti }, { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: this.refreshExp });
  }

  async generateTokensForUser(user: { id: any; email: any; }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.signAccess(payload);

    const jti = uuidv4();
    const refreshToken = this.signRefresh(payload, jti);
    const hashed = await bcrypt.hash(refreshToken, this.refreshHashRounds);

    // persist new refresh token entry (append)
    await this.usersService.addRefreshToken(user.id, { jti, hashedToken: hashed, createdAt: new Date().toISOString() });

    return { accessToken, refreshToken };
  }

  // called by /auth/refresh
  async rotateRefresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { sub: userId, jti } = payload;
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    // find stored token entry by jti
    const tokenEntry = (user.refreshTokens || []).find(t => t.jti === jti);
    if (!tokenEntry) {
      // Reuse or theft: unknown jti — revoke all tokens for user
      await this.usersService.clearRefreshTokens(userId);
      throw new UnauthorizedException('Refresh token reuse detected. All sessions revoked.');
    }

    // verify hash
    const ok = await bcrypt.compare(refreshToken, tokenEntry.hashedToken);
    if (!ok) {
      // token reuse (present jti but hash mismatch) — security incident
      await this.usersService.clearRefreshTokens(userId);
      throw new UnauthorizedException('Refresh token reuse detected. All sessions revoked.');
    }

    // rotate: remove the old jti entry and add a new jti entry atomically in DB
    const newJti = uuidv4();
    const newRefreshToken = this.signRefresh({ sub: userId, email: user.email }, newJti);
    const newHashed = await bcrypt.hash(newRefreshToken, this.refreshHashRounds);

    await this.usersService.replaceRefreshToken(userId, jti, { jti: newJti, hashedToken: newHashed, createdAt: new Date().toISOString() });

    // issue new access token too
    const accessToken = this.signAccess({ sub: userId, email: user.email });

    return { accessToken, refreshToken: newRefreshToken };
  }

  // revoke a single token (logout from device)
  async revokeToken(userId: string, jti: string) {
    await this.usersService.removeRefreshToken(userId, jti);
  }
}
