import { Global, Logger, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';
import { CacheService } from './cache.service';

/** Global cache module: a Keyv Redis store behind CacheService. REDIS_* are optional so dev runs without Redis. */
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
        // Logical-DB selector: the e2e suite sets REDIS_DB=1 so its un-prefixed keys cannot
        // collide with a dev server's cache on the same Redis instance.
        const db = config.get<string>('REDIS_DB') ?? '';
        const auth = password ? `:${password}@` : '';
        const dbPath = db ? `/${db}` : '';
        const keyv = createKeyv({
          url: `redis://${auth}${host}:${port}${dbPath}`,
          socket: {
            // Bounded reconnect: the default (unbounded) one hangs the first command while
            // Redis is down. Give up fast → miss → DB fallback; later calls retry and recover.
            reconnectStrategy: (retries) => (retries > 2 ? false : Math.min(retries * 100, 300)),
            connectTimeout: 2000,
          },
        });
        // A downed Redis emits 'error' on the store; without a listener Node crashes.
        keyv.on('error', (err) => logger.warn(`redis cache unavailable: ${err}`));
        return { stores: [keyv] };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
