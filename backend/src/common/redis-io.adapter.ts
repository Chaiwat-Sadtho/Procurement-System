import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

// Same redis:// shape CacheModule / throttler build from REDIS_* (host/port/password/db).
function buildRedisUrl(config: ConfigService): string {
  const host = config.get<string>('REDIS_HOST') ?? 'localhost';
  const port = config.get<number>('REDIS_PORT') ?? 6379;
  const password = config.get<string>('REDIS_PASSWORD') ?? '';
  const db = config.get<string>('REDIS_DB') ?? '';
  const auth = password ? `:${password}@` : '';
  const dbPath = db ? `/${db}` : '';
  return `redis://${auth}${host}:${port}${dbPath}`;
}

/**
 * socket.io adapter backed by Redis pub/sub so emits fan out across backend instances.
 * Graceful-degrade: if Redis is unreachable (e.g. `npm run start:dev` with no Redis),
 * fall back to the default in-memory adapter so the app still boots single-instance.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger('RedisIoAdapter');
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  async connectToRedis(): Promise<void> {
    const url = buildRedisUrl(this.appContext.get(ConfigService));
    const pubClient = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    const subClient = pubClient.duplicate();
    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('socket.io Redis adapter enabled (multi-instance)');
    } catch (err) {
      this.logger.warn(
        `Redis unavailable - socket.io running single-instance (in-memory): ${String(err)}`,
      );
      pubClient.disconnect();
      subClient.disconnect();
    }
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options) as {
      adapter: (a: ReturnType<typeof createAdapter>) => void;
    };
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
