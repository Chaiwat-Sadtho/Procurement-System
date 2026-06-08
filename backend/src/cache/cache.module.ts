import { Global, Logger, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';
import { CacheService } from './cache.service';

/**
 * Global cache module: registers a Keyv Redis store and exposes CacheService.
 * REDIS_* are optional (graceful degradation) — defaults let dev run without Redis.
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('CacheModule');
        const host = config.get<string>('REDIS_HOST') ?? 'localhost';
        const port = config.get<number>('REDIS_PORT') ?? 6379;
        const password = config.get<string>('REDIS_PASSWORD') ?? '';
        // Optional logical-DB selector. Unset in dev/prod (Redis db 0); the e2e suite
        // sets REDIS_DB=1 so its cache state can never collide with a dev/prod cache on
        // the same Redis instance — the keys are un-prefixed, so without this a dev
        // server left running on :3000 could race the test's invalidation.
        const db = config.get<string>('REDIS_DB') ?? '';
        const auth = password ? `:${password}@` : '';
        const dbPath = db ? `/${db}` : '';
        const keyv = createKeyv({
          url: `redis://${auth}${host}:${port}${dbPath}`,
          socket: {
            // Graceful degradation: with the default (unbounded) reconnect, the very
            // first command awaits a connection that never comes when Redis is down,
            // hanging the request. Give up after a couple quick retries so the command
            // settles (miss) fast and CacheService falls back to the DB; each later
            // call retries fresh, so the cache recovers once Redis returns.
            reconnectStrategy: (retries) => (retries > 2 ? false : Math.min(retries * 100, 300)),
            connectTimeout: 2000,
          },
        });
        // A downed Redis still emits 'error' on the Keyv store; without a listener
        // Node would crash ("Unhandled 'error' event"). Log and keep serving.
        keyv.on('error', (err) => logger.warn(`redis cache unavailable: ${err}`));
        return { stores: [keyv] };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
