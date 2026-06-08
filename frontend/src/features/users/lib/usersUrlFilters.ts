import type { UrlFilterConfig } from '@/shared/hooks/useUrlFilters'
import { ROLE_OPTIONS } from './roleLabels'
import { DEFAULT_USER_FILTERS, type StatusFilter, type UserFilterValues } from './userFilters'

// closed set of valid roles (single source of truth = ROLE_OPTIONS)
const VALID_ROLES = new Set<string>(ROLE_OPTIONS.map((o) => o.value))
const VALID_STATUS = new Set<StatusFilter>(['active', 'inactive'])

export function parseUserFilters(params: URLSearchParams): UserFilterValues {
  const search = params.get('search') ?? '' // verbatim (no trim) — serialize/filter trim instead
  const rawRole = params.get('role')
  // defensive: role is a closed enum → keep only a known value, else 'all'
  const role = rawRole && VALID_ROLES.has(rawRole) ? rawRole : 'all'
  const rawStatus = params.get('status')
  const status: StatusFilter =
    rawStatus && VALID_STATUS.has(rawStatus as StatusFilter) ? (rawStatus as StatusFilter) : 'all'
  return { search, role, status }
}

export function serializeUserFilters(v: UserFilterValues, params: URLSearchParams): void {
  const s = v.search?.trim()
  if (s) params.set('search', s)
  else params.delete('search')
  if (v.role && v.role !== 'all') params.set('role', v.role)
  else params.delete('role')
  if (v.status && v.status !== 'all') params.set('status', v.status)
  else params.delete('status')
}

export const usersUrlFilterConfig: UrlFilterConfig<UserFilterValues> = {
  defaults: DEFAULT_USER_FILTERS,
  parse: parseUserFilters,
  serialize: serializeUserFilters,
  resetPage: false, // Users filters client-side (no usePagination) → no page param in the URL
}
