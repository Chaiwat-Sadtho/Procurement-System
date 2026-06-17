import { ExecutionContext } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { FailOpenThrottlerGuard } from '@app/throttling/fail-open-throttler.guard';

// ThrottlerGuard.handleRequest is protected; expose the two methods we spy on as a
// typed target so jest.spyOn resolves cleanly (a protected key is not assignable to
// spyOn's method constraint).
const throttlerProto = ThrottlerGuard.prototype as unknown as {
  handleRequest(requestProps: ThrottlerRequest): Promise<boolean>;
  canActivate(context: ExecutionContext): Promise<boolean>;
};

describe('FailOpenThrottlerGuard', () => {
  // The base constructor only stores its three args; the override logic exercised
  // here (handleRequest / canActivate) never touches them, so they are cast away.
  const guard = new FailOpenThrottlerGuard({ throttlers: [] }, {} as never, {} as never);

  // handleRequest is protected on the guard too; cast to call the override directly.
  const invokeHandleRequest = (): Promise<boolean> =>
    (
      guard as unknown as {
        handleRequest(requestProps: ThrottlerRequest): Promise<boolean>;
      }
    ).handleRequest({} as ThrottlerRequest);

  afterEach(() => jest.restoreAllMocks());

  describe('handleRequest (fail-open)', () => {
    it('allows the request when the storage layer throws (Redis down)', async () => {
      jest
        .spyOn(throttlerProto, 'handleRequest')
        .mockRejectedValueOnce(new Error('Redis connection lost'));

      await expect(invokeHandleRequest()).resolves.toBe(true);
    });

    it('re-throws ThrottlerException so an exceeded limit still returns 429', async () => {
      jest.spyOn(throttlerProto, 'handleRequest').mockRejectedValueOnce(new ThrottlerException());

      await expect(invokeHandleRequest()).rejects.toBeInstanceOf(ThrottlerException);
    });
  });

  describe('canActivate (master switch)', () => {
    afterEach(() => delete process.env.THROTTLE_ENABLED);

    it('skips throttling entirely when THROTTLE_ENABLED=false', async () => {
      process.env.THROTTLE_ENABLED = 'false';
      const superCanActivate = jest.spyOn(throttlerProto, 'canActivate');

      await expect(guard.canActivate({} as ExecutionContext)).resolves.toBe(true);
      expect(superCanActivate).not.toHaveBeenCalled();
    });
  });
});
