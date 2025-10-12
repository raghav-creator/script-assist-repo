import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '../guards/rate-limit.guard';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  limit: number;     
  windowMs: number; 
}

export function RateLimit(options: RateLimitOptions) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, options),
    UseGuards(RateLimitGuard),
  );
}
