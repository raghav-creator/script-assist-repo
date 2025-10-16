import { Injectable, Logger } from '@nestjs/common';
import * as PromClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: PromClient.Registry;

  constructor() {
    // Create a new Registry
    this.registry = new PromClient.Registry();

    // Collect default metrics (CPU, memory, event loop, etc.)
    PromClient.collectDefaultMetrics({
      register: this.registry,
      // optional prefix for metric names
      prefix: 'app_',
    });

    this.logger.log('Prometheus metrics initialized');
  }

  /**
   * Get the Prometheus Registry instance
   * so it can be used in a controller to expose metrics
   */
  getRegistry(): PromClient.Registry {
    return this.registry;
  }

  /**
   * Register a custom counter
   */
  createCounter(name: string, help: string, labelNames: string[] = []) {
    const counter = new PromClient.Counter({
      name,
      help,
      labelNames,
      registers: [this.registry],
    });
    this.logger.log(`Counter "${name}" registered`);
    return counter;
  }

  /**
   * Register a custom gauge
   */
  createGauge(name: string, help: string, labelNames: string[] = []) {
    const gauge = new PromClient.Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry],
    });
    this.logger.log(`Gauge "${name}" registered`);
    return gauge;
  }
}
