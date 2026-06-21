import { ConfigService } from '@nestjs/config';
import { envInt, buildThrottlerOptions } from '@app/throttling/throttler-config';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

describe('throttler-config', () => {
  describe('envInt', () => {
    it('returns the parsed value when env is a positive integer', () => {
      expect(envInt(configWith({ X: '7' }), 'X', 5)).toBe(7);
    });
    it('falls back when env is unset, non-numeric, or non-positive', () => {
      expect(envInt(configWith({}), 'X', 5)).toBe(5);
      expect(envInt(configWith({ X: 'abc' }), 'X', 5)).toBe(5);
      expect(envInt(configWith({ X: '0' }), 'X', 5)).toBe(5);
    });
  });

  describe('buildThrottlerOptions', () => {
    it('builds a named global throttler with ttl in ms and env-driven limit', () => {
      const opts = buildThrottlerOptions(configWith({ THROTTLE_GLOBAL_LIMIT: '42' }));
      expect(opts.throttlers[0]).toMatchObject({ name: 'default', ttl: 60000, limit: 42 });
      expect(opts.storage).toBeDefined();
    });
    it('defaults the global limit to 100', () => {
      const opts = buildThrottlerOptions(configWith({}));
      expect(opts.throttlers[0].limit).toBe(100);
    });
  });
});
