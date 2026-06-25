import { resolveCorsOrigin, DEV_DEFAULT_ORIGIN } from '@app/common/cors';

describe('resolveCorsOrigin', () => {
  it('returns a single configured origin as a one-element allowlist', () => {
    expect(resolveCorsOrigin('https://app.example.com', 'production')).toEqual([
      'https://app.example.com',
    ]);
  });

  it('splits a comma-separated value into a multi-origin allowlist', () => {
    expect(
      resolveCorsOrigin('https://app.example.com,https://admin.example.com', 'production'),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('trims whitespace and drops empty entries', () => {
    expect(resolveCorsOrigin(' https://a.com , , https://b.com ,', 'production')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('falls back to the Vite dev origin when unset outside production', () => {
    expect(resolveCorsOrigin(undefined, 'development')).toEqual([DEV_DEFAULT_ORIGIN]);
  });

  it('falls back to the dev origin when NODE_ENV is undefined (local default)', () => {
    expect(resolveCorsOrigin(undefined, undefined)).toEqual([DEV_DEFAULT_ORIGIN]);
  });

  it('fails closed: throws when unset in production (no wildcard fallback)', () => {
    expect(() => resolveCorsOrigin(undefined, 'production')).toThrow(/CORS_ORIGIN/);
  });

  it('fails closed: throws when value is whitespace/commas only in production', () => {
    expect(() => resolveCorsOrigin('  ,  , ', 'production')).toThrow(/CORS_ORIGIN/);
  });
});
