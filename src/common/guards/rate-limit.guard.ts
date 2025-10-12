import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private redis: Redis.Redis;

  constructor(private reflector: Reflector) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) return true; // No rate limiting metadata → allow request

    const request = context.switchToHttp().getRequest();
    const identifier = this.getIdentifier(request);

    const allowed = await this.incrementCounter(identifier, options);
    if (!allowed) {
      throw new BadRequestException(
        `Rate limit exceeded: ${options.limit} requests per ${options.windowMs / 1000}s.`,
      );
    }

    return true;
  }

  private async incrementCounter(id: string, options: RateLimitOptions): Promise<boolean> {
    const key = `rate_limit:${id}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      // Set expiration for the first hit
      await this.redis.pexpire(key, options.windowMs);
    }

    return current <= options.limit;
  }

  private getIdentifier(request: any): string {
   
    if (request.user?.id) return `user:${request.user.id}`;

    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    return `ip:${this.hash(ip)}`;
  }

  private hash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }
}
