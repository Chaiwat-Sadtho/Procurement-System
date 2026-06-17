import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { buildThrottlerOptions } from './throttler-config';
import { FailOpenThrottlerGuard } from './fail-open-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildThrottlerOptions(config),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: FailOpenThrottlerGuard }],
})
export class ThrottlingModule {}
