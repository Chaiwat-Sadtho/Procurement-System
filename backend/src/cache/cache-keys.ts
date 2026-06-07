/**
 * Central registry of cache keys, namespaces and TTLs (seconds) so read and
 * write paths across services stay in sync. CacheService multiplies TTL by 1000.
 */
export const CacheTtl = {
  REFERENCE: 3600, // vendor-categories, departments (rarely change)
  AUTH_ME: 300,
  VENDOR_LIST: 120,
  VENDOR_RATINGS: 120,
} as const;

export const CacheKeys = {
  vendorCategories: 'ref:vendor-categories',
  departments: 'ref:departments',
  authMe: (userId: number) => `auth:me:${userId}`,
  vendorListNs: 'vendor:list',
  vendorRatingsNs: (vendorId: number) => `vendor:ratings:${vendorId}`,
} as const;

/** Stable hash of a query object (sorted keys) so each page/filter caches separately. */
export function hashQuery(query: Record<string, unknown>): string {
  const sorted = Object.keys(query)
    .sort()
    .map((k) => `${k}=${String(query[k] ?? '')}`)
    .join('&');
  return sorted || 'default';
}
