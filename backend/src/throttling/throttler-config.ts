import { ConfigService } from '@nestjs/config';
import { seconds, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { RedisOptions } from 'ioredis';

/** Object form of ThrottlerModuleOptions — narrowed so callers can read `.throttlers`/`.storage` directly. */
type ThrottlerOptionsObject = Extract<ThrottlerModuleOptions, { throttlers: unknown }>;

export function envInt(config: ConfigService, key: string, fallback: number): number {
  const raw = config.get<string>(key);
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Build a redis:// URL from the same REDIS_* vars CacheModule uses. */
function buildRedisUrl(config: ConfigService): string {
  const host = config.get<string>('REDIS_HOST') ?? 'localhost';
  const port = config.get<number>('REDIS_PORT') ?? 6379;
  const password = config.get<string>('REDIS_PASSWORD') ?? '';
  const db = config.get<string>('REDIS_DB') ?? '';
  const auth = password ? `:${password}@` : '';
  const dbPath = db ? `/${db}` : '';
  return `redis://${auth}${host}:${port}${dbPath}`;
}

export const GLOBAL_THROTTLER_NAME = 'default';

// lazyConnect keeps option-building socket-free (no jest handle leak); the fail-fast options let the
// guard fail open immediately instead of hanging when Redis is down.
const THROTTLER_REDIS_OPTIONS: RedisOptions = {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
};

export function buildThrottlerOptions(config: ConfigService): ThrottlerOptionsObject {
  return {
    throttlers: [
      {
        name: GLOBAL_THROTTLER_NAME,
        ttl: seconds(envInt(config, 'THROTTLE_GLOBAL_TTL', 60)),
        limit: envInt(config, 'THROTTLE_GLOBAL_LIMIT', 100),
      },
    ],
    storage: new ThrottlerStorageRedisService(buildRedisUrl(config), THROTTLER_REDIS_OPTIONS),
    errorMessage: 'คำขอถี่เกินไป กรุณาลองใหม่ในภายหลัง',
  };
}

// Read at import time (decorator evaluation): real env vars win, but .env may not be loaded yet.
export const AUTH_THROTTLE = {
  default: { ttl: seconds(60), limit: Number(process.env.THROTTLE_AUTH_LIMIT) || 5 },
};
export const PW_THROTTLE = {
  default: { ttl: seconds(60), limit: Number(process.env.THROTTLE_PW_LIMIT) || 10 },
};
