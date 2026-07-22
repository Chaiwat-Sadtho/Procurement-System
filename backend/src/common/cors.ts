import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

/** Vite dev server origin — the local default when CORS_ORIGIN is unset (non-production). */
export const DEV_DEFAULT_ORIGIN = 'http://localhost:5173';

/**
 * Resolve the CORS allowlist from CORS_ORIGIN (comma-separated). Fail-closed: production throws on an
 * empty value rather than booting with an open policy; elsewhere it falls back to the Vite dev origin.
 */
export function resolveCorsOrigin(
  rawOrigin: string | undefined,
  nodeEnv: string | undefined,
): string[] {
  const origins = (rawOrigin ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length > 0) return origins;

  if (nodeEnv === 'production') {
    throw new Error(
      'CORS_ORIGIN must be set in production (comma-separated allowlist of allowed origins). ' +
        'Refusing to boot with an open CORS policy.',
    );
  }

  return [DEV_DEFAULT_ORIGIN];
}

/** Enable HTTP CORS from the configured allowlist (shared by main.ts bootstrap and e2e). */
export function applyCors(app: INestApplication, config: ConfigService): void {
  app.enableCors({
    origin: resolveCorsOrigin(config.get<string>('CORS_ORIGIN'), config.get<string>('NODE_ENV')),
  });
}
