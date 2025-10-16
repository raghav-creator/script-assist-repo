import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {

  private readonly redis: Redis;
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, any>();
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error:any) {
      this.logger.error(`Failed to set cache key ${key}: ${error.message}`, error.stack);
    }

  }
 

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error:any) {
      this.logger.error(`Failed to get cache key ${key}: ${error.message}`, error.stack);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error:any) {
      this.logger.error(`Failed to delete cache key ${key}: ${error.message}`, error.stack);
      return false;
    }
  }

 
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('Cache cleared successfully');
    } catch (error:any) {
      this.logger.error(`Failed to clear cache: ${error.message}`, error.stack);
    }
  }

  
  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error:any) {
      this.logger.error(`Failed to check cache key ${key}: ${error.message}`, error.stack);
      return false;
    }
  }


  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

 
  async decr(key: string): Promise<number> {
    return this.redis.decr(key);
  }
}
