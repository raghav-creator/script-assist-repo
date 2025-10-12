import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { Request } from 'express';
  import * as bcrypt from 'bcrypt';
  import { UsersService } from '../../modules/users/users.service';
  
  @Injectable()
  export class JwtAuthGuard implements CanActivate {
    constructor(
      private readonly jwtService: JwtService,
      private readonly usersService: UsersService, // Used to validate refresh tokens
    ) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<Request>();
  
      const authHeader = request.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing access token');
      }
  
      const token = authHeader.split(' ')[1];
  
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });
  
        request['user'] = payload; // Attach payload to request object
        return true;
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired access token');
      }
    }
  

    async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
      const user = await this.usersService.findById(userId);
      if (!user || !user.refreshTokenHash) return false;
  
      // Compare provided refresh token with hashed token in DB
      const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      return isValid;
    }
  
    
    async hashToken(token: string): Promise<string> {
      const saltRounds = 10;
      return bcrypt.hash(token, saltRounds);
    }
  }
  