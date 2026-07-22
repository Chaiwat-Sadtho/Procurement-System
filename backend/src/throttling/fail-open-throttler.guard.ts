import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

/**
 * ThrottlerGuard that can be switched off (THROTTLE_ENABLED=false, used by the e2e suite) and falls
 * open when the Redis storage throws — availability-first, matching CacheService.
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
