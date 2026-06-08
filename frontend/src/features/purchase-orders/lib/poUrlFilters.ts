import type { UrlFilterConfig } from '@/shared/hooks/useUrlFilters'
import type { POListFilterValues } from '../components/POListFilterForm'
import type { PoStatus } from '../types'

export const DEFAULT_PO_FILTERS: POListFilterValues = {
  status: 'all',
  vendorId: 'all',
}

// exhaustive over PoStatus → adding a status makes this a compile error until handled
const PO_STATUS_FLAGS = {
  draft: true,
  sent: true,
  acknowledged: true,
  partially_received: true,
  completed: true,
  cancelled: true,
} satisfies Record<PoStatus, true>
const VALID_PO_STATUS = new Set<string>(Object.keys(PO_STATUS_FLAGS))

export function parsePoFilters(params: URLSearchParams): POListFilterValues {
  const rawStatus = params.get('status')
  // status is a closed enum → keep only a known value, else 'all'
  const status = rawStatus && VALID_PO_STATUS.has(rawStatus) ? rawStatus : 'all'
  const rawVendor = params.get('vendorId')
  // defensive = SYNTACTIC only (digits); membership in the vendor list is not checked
  const vendorId = rawVendor && /^\d+$/.test(rawVendor) ? rawVendor : 'all'
  return { status, vendorId }
}

export function serializePoFilters(v: POListFilterValues, params: URLSearchParams): void {
  if (v.status && v.status !== 'all') params.set('status', v.status)
  else params.delete('status')
  if (v.vendorId && v.vendorId !== 'all') params.set('vendorId', v.vendorId)
  else params.delete('vendorId')
}

export const poUrlFilterConfig: UrlFilterConfig<POListFilterValues> = {
  defaults: DEFAULT_PO_FILTERS,
  parse: parsePoFilters,
  serialize: serializePoFilters,
  // no resetPage → default true (POListPage is paginated via usePagination)
}
