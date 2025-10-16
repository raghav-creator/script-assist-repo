
import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers = new Map<string, CircuitBreaker<any, any>>();

  private createBreaker(key: string) {
    const options = {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    };
    const breaker = new CircuitBreaker(async (config: AxiosRequestConfig) => {
      const r = await axios(config);
      return r.data;
    }, options);

    breaker.on('open', () => this.logger.warn(`breaker open for ${key}`));
    breaker.on('halfOpen', () => this.logger.log(`breaker halfOpen for ${key}`));
    breaker.on('close', () => this.logger.log(`breaker closed for ${key}`));

    this.breakers.set(key, breaker);
    return breaker;
  }

  async fire(key: string, config: AxiosRequestConfig) {
    const breaker = this.breakers.get(key) ?? this.createBreaker(key);
    try {
      return await breaker.fire(config);
    } catch (err:any) {
      
      this.logger.warn(`breaker fire failed for ${key}: ${err.message}`);
      throw err;
    }
  }
}
