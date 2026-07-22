/** Central registry of cache keys, namespaces and TTLs (seconds) so read and write paths stay in sync. */
export const CacheTtl = {
  REFERENCE: 3600, // vendor-categories, departments (rarely change)
  AUTH_ME: 300,
  VENDOR_LIST: 120,
  VENDOR_RATINGS: 120,
  ANNOUNCEMENTS_PUBLIC: 60, // public login announcements — invalidated on every write
} as const;

export const CacheKeys = {
  vendorCategories: 'ref:vendor-categories',
  departments: 'ref:departments',
  authMe: (userId: number) => `auth:me:${userId}`,
  vendorListNs: 'vendor:list',
  vendorRatingsNs: (vendorId: number) => `vendor:ratings:${vendorId}`,
  announcementPublicNs: 'announcement:public',
} as const;

/** Coerce a query value to a stable string without tripping no-base-to-string on objects. */
function stringifyValue(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    default:
      return value == null ? '' : JSON.stringify(value);
  }
}

/** Stable hash of a query object (sorted keys) so each page/filter caches separately. */
export function hashQuery(query: Record<string, unknown>): string {
  const sorted = Object.keys(query)
    .sort()
    .map((k) => `${k}=${stringifyValue(query[k])}`)
    .join('&');
  return sorted || 'default';
}
