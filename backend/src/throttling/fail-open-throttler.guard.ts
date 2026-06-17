import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

/**
 * ThrottlerGuard variant with two behaviours:
 *  1. Master switch — when THROTTLE_ENABLED=false, skip throttling entirely. The
 *     e2e suite sets this because many specs hammer /auth/login from 127.0.0.1 and
 *     would otherwise trip the limit.
 *  2. Fail-open — if the Redis storage layer throws (Redis down), allow the request
 *     instead of returning 500 (availability-first, matching CacheService). A real
 *     ThrottlerException (limit exceeded) must still propagate to a 429.
 */
@Injectable()
export class FailOpenThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.THROTTLE_ENABLED === 'false') return true;
    return super.canActivate(context);
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    try {
      return await super.handleRequest(requestProps);
    } catch (err) {
      if (err instanceof ThrottlerException) throw err; // limit exceeded -> 429
      return true; // storage/infra error -> fail open
    }
  }
}
