import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { buildThrottlerOptions } from './throttler-config';
import { FailOpenThrottlerGuard } from './fail-open-throttler.guard';

// Connect at boot so the very first request is counted (lazyConnect would let it race the connection
// and fail open). Capped by a timeout so a dead Redis never blocks boot.
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
