import { Injectable } from '@nestjs/common';
import client from 'prom-client';

@Injectable()
export class MetricsService {
  private registry = new client.Registry();
  public httpCounter: client.Counter<string>;
  public httpHistogram: client.Histogram<string>;
  public queueGauge: client.Gauge<string>;

  constructor() {
    client.collectDefaultMetrics({ register: this.registry });

    this.httpCounter = new client.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpHistogram = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 1],
      registers: [this.registry],
    });

    this.queueGauge = new client.Gauge({
      name: 'queue_waiting_total',
      help: 'Number of waiting jobs in queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });
  }

  metrics() {
    return this.registry.metrics();
  }

  incHttp(method: string, route: string, status: string) {
    this.httpCounter.inc({ method, route, status }, 1);
  }

  observeDuration(method: string, route: string, status: string, seconds: number) {
    this.httpHistogram.observe({ method, route, status }, seconds);
  }

  setQueue(queueName: string, count: number) {
    this.queueGauge.set({ queue: queueName }, count);
  }
}
