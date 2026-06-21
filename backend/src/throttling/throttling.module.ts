import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { buildThrottlerOptions } from './throttler-config';
import { FailOpenThrottlerGuard } from './fail-open-throttler.guard';

/**
 * Open the throttler's Redis connection at boot so rate limiting is exact from the
 * first request. Without this, lazyConnect + enableOfflineQueue:false makes the very
 * first request race the connection and fail open (one un-counted request per
 * process). Runs only in this module factory — the throttler-config unit test calls
 * buildThrottlerOptions directly and never reaches here, so construction stays
 * socket-free (no jest handle leak). Never blocks boot: the eager connect is capped
 * by a timeout, and if Redis is down the guard fails open until a background retry
 * connects.
 */
async function warmUpRedis(storage: unknown): Promise<void> {
  const client = (storage as { redis?: { connect(): Promise<unknown> } } | undefined)?.redis;
  if (!client) return;
  const connect = client.connect().then(
    () => undefined,
    () => undefined, // Redis down at boot → guard fails open until background retry
  );
  await Promise.race([connect, new Promise<void>((resolve) => setTimeout(resolve, 3000).unref())]);
}

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const options = buildThrottlerOptions(config);
        await warmUpRedis(options.storage);
        return options;
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: FailOpenThrottlerGuard }],
})
export class ThrottlingModule {}
