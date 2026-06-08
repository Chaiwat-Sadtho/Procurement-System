import type { UrlFilterConfig } from '@/shared/hooks/useUrlFilters'
import type { GRNListFilterValues } from '../components/GRNListFilterForm'
import type { GrnStatus } from '../types'

export const DEFAULT_GRN_FILTERS: GRNListFilterValues = {
  status: 'all',
  poId: 'all',
}

// exhaustive over GrnStatus → adding a status makes this a compile error until handled
const GRN_STATUS_FLAGS = {
  partial: true,
  complete: true,
} satisfies Record<GrnStatus, true>
const VALID_GRN_STATUS = new Set<string>(Object.keys(GRN_STATUS_FLAGS))

export function parseGrnFilters(params: URLSearchParams): GRNListFilterValues {
  const rawStatus = params.get('status')
  // status is a closed enum → keep only a known value, else 'all'
  const status = rawStatus && VALID_GRN_STATUS.has(rawStatus) ? rawStatus : 'all'
  const rawPo = params.get('poId')
  // defensive = SYNTACTIC only (digits); membership in the PO list is not checked
  const poId = rawPo && /^\d+$/.test(rawPo) ? rawPo : 'all'
  return { status, poId }
}

export function serializeGrnFilters(v: GRNListFilterValues, params: URLSearchParams): void {
  if (v.status && v.status !== 'all') params.set('status', v.status)
  else params.delete('status')
  if (v.poId && v.poId !== 'all') params.set('poId', v.poId)
  else params.delete('poId')
}

export const grnUrlFilterConfig: UrlFilterConfig<GRNListFilterValues> = {
  defaults: DEFAULT_GRN_FILTERS,
  parse: parseGrnFilters,
  serialize: serializeGrnFilters,
  // no resetPage → default true (GRNListPage is paginated via usePagination)
}
