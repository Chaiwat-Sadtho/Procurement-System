import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Single abstraction over the cache backend. Feature services depend on this,
 * never on cache-manager directly, so the store can be swapped and mocked easily.
 * Every method swallows backend errors (graceful degradation): a downed Redis
 * degrades to a cache miss / no-op invalidate rather than failing the request.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return (await this.cache.get<T>(key)) ?? undefined;
    } catch (err) {
      this.logger.warn(`cache get failed for ${key}: ${err}`);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      // cache-manager v7 takes TTL in milliseconds; helpers here take seconds.
      await this.cache.set(key, value, ttlSeconds * 1000);
    } catch (err) {
      this.logger.warn(`cache set failed for ${key}: ${err}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (err) {
      this.logger.warn(`cache del failed for ${key}: ${err}`);
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;
    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
