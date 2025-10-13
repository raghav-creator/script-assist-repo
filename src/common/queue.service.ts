import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queue: Queue;
  private readonly redisOpts = { connection: process.env.BULLMQ_CONNECTION_URL || process.env.REDIS_URL || 'redis://localhost:6379' };
  private readonly highWatermark = Number(process.env.HIGH_WATERMARK || 1000);
  private readonly lowWatermark = Number(process.env.LOW_WATERMARK || 200);

  constructor() {
    this.queue = new Queue('task-processing', { connection: this.redisOpts });
    // Optionally set up a periodic monitor (e.g., every 10s)
    setInterval(() => this.checkWatermarks().catch(e => this.logger.warn('wm check error', e)), 10_000);
  }

  async addJob(name: string, data: any, opts?: object) {
    return this.queue.add(name, data, opts || {});
  }

  async checkWatermarks() {
    const waiting = await this.queue.getWaitingCount();
    if (waiting > this.highWatermark) {
      if (!(await this.queue.isPaused())) {
        this.logger.warn(`Queue waiting ${waiting} > high watermark ${this.highWatermark} — pausing producers/workers as appropriate`);
        await this.queue.pause();
      }
    } else if (waiting < this.lowWatermark) {
      if (await this.queue.isPaused()) {
        this.logger.log(`Queue waiting ${waiting} < low watermark ${this.lowWatermark} — resuming queue`);
        await this.queue.resume();
      }
    }
  }

  // expose queue stats
  async getStats() {
    return {
      waiting: await this.queue.getWaitingCount(),
      active: await this.queue.getActiveCount(),
      delayed: await this.queue.getDelayedCount(),
      failed: await this.queue.getFailedCount(),
      completed: await this.queue.getCompletedCount(),
    };
  }
}
