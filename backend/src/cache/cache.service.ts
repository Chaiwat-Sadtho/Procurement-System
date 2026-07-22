import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * The only cache abstraction feature services depend on (never cache-manager directly). Every method
 * swallows backend errors: a downed Redis degrades to a miss / no-op instead of failing the request.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return (await this.cache.get<T>(key)) ?? undefined;
    } catch (err) {
      this.logger.warn(`cache get failed for ${key}: ${this.formatError(err)}`);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      // cache-manager v7 takes TTL in milliseconds; helpers here take seconds.
      await this.cache.set(key, value, ttlSeconds * 1000);
    } catch (err) {
      this.logger.warn(`cache set failed for ${key}: ${this.formatError(err)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (err) {
      this.logger.warn(`cache del failed for ${key}: ${this.formatError(err)}`);
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;
    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  private formatError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private genKey(namespace: string): string {
    return `${namespace}:gen`;
  }

  private async generation(namespace: string): Promise<number> {
    const gen = await this.get<number>(this.genKey(namespace));
    return gen ?? 1;
  }

  /** Namespaced cache-aside: the key embeds the namespace generation, so bumping one counter retires them all (no SCAN). */
  async getOrSetNamespaced<T>(
    namespace: string,
    subkey: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const gen = await this.generation(namespace);
    const key = `${namespace}:g${gen}:${subkey}`;
    return this.getOrSet(key, ttlSeconds, factory);
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    const gen = await this.generation(namespace);
    // TTL 0 = never expires: an expired counter would resurrect a stale generation's keys.
    await this.set(this.genKey(namespace), gen + 1, 0);
  }
}
