
import { Injectable } from '@nestjs/common';
import Redlock from 'redlock';
import Redis from 'ioredis';

@Injectable()
export class RedlockService {
  private redlock: Redlock;
  constructor() {
    const client = new Redis(process.env.REDIS_URL);
    this.redlock = new Redlock([client], {
      retryCount: 5,
      retryDelay: 200,
      driftFactor: 0.01,
    });
  }

  async withLock<T>(key: string, ttl = 2000, callback: () => Promise<T>): Promise<T> {
    const lock = await this.redlock.acquire([`locks:${key}`], ttl);
    try {
      return await callback();
    } finally {
      try { await lock.release(); } catch {}
    }
  }
}
