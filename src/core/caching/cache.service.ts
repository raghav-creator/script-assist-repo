
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client:Redis;
  private sub: Redis;
  private instanceId = randomUUID();

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url);
    this.sub = new Redis(url);

    this.sub.subscribe('cache-invalidate', (err) => {
      if (err) this.logger.error('subscribe error', err);
    });

    this.sub.on('message', (channel, message) => {
      try {
        const { key, origin } = JSON.parse(message);
        if (origin === this.instanceId) return; // ignore self
        this.client.del(key).catch(e => this.logger.warn('del failed', e));
      } catch (e) {
        this.logger.error('invalid invalidate message', e);
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    return v ? JSON.parse(v) as T : null;
  }

  async set(key: string, value: any, ttlSeconds = 300) {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async invalidate(key: string) {
    await this.client.del(key);
    await this.client.publish('cache-invalidate', JSON.stringify({ key, origin: this.instanceId }));
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.sub.quit();
  }
}
