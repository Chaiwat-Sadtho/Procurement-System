import { ConfigService } from '@nestjs/config';
import { seconds, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { RedisOptions } from 'ioredis';

/**
 * Object form of ThrottlerModuleOptions. The exported union also allows a bare
 * `ThrottlerOptions[]`; narrowing here lets callers read `.throttlers`/`.storage`
 * without union-narrowing while staying assignable to ThrottlerModuleOptions.
 */
type ThrottlerOptionsObject = Extract<ThrottlerModuleOptions, { throttlers: unknown }>;

/** Parse a positive-integer env var via ConfigService, else fall back. */
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

/**
 * ioredis options for the throttler's own Redis client:
 *  - lazyConnect: do not open a socket on construction — connect on the first
 *    throttled request. Keeps unit tests that only build options (never issue a
 *    command) from leaking an open handle, and avoids connecting at boot.
 *  - enableOfflineQueue:false + maxRetriesPerRequest:1: fail fast when Redis is
 *    down so the guard's fail-open path triggers immediately instead of hanging.
 * The (url, options) overload keeps disconnectRequired=true, so the storage closes
 * its own connection on module destroy.
 */
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

// Per-route override values are read at import time (decorator evaluation). Real
// env vars (docker-compose `environment`) override fine; .env-only is not
// guaranteed because this import may run before ConfigModule loads .env.
export const AUTH_THROTTLE = {
  default: { ttl: seconds(60), limit: Number(process.env.THROTTLE_AUTH_LIMIT) || 5 },
};
export const PW_THROTTLE = {
  default: { ttl: seconds(60), limit: Number(process.env.THROTTLE_PW_LIMIT) || 10 },
};
