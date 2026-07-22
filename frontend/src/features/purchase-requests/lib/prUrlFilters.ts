import type { UrlFilterConfig } from '@/shared/hooks/useUrlFilters'
import type { PRListFilterValues } from '../components/PRListFilterForm'
import type { PRStatus } from '../types'

export const DEFAULT_PR_FILTERS: PRListFilterValues = {
  prNumber: '',
  search: '',
  from: '',
  to: '',
  requesterName: '',
  status: 'all',
}

// The valid URL statuses mirror the filter form's Select, not the full PRStatus enum — a status the
// form cannot display would round-trip into a blank Select. Partial<> still rejects typos.
const PR_FILTER_STATUS_FLAGS = {
  draft: true,
  submitted: true,
  approved: true,
  rejected: true,
} satisfies Partial<Record<PRStatus, true>>
const VALID_PR_STATUS = new Set<string>(Object.keys(PR_FILTER_STATUS_FLAGS))

export function parsePrFilters(params: URLSearchParams): PRListFilterValues {
  const rawStatus = params.get('status')
  const status = rawStatus && VALID_PR_STATUS.has(rawStatus) ? rawStatus : 'all'
  // Text and dates are read verbatim; serialize is what canonicalises them
  return {
    prNumber: params.get('prNumber') ?? '',
    search: params.get('search') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    requesterName: params.get('requesterName') ?? '',
    status,
  }
}

function setTrimmed(params: URLSearchParams, key: string, value: string | undefined): void {
  const v = value?.trim()
  if (v) params.set(key, v)
  else params.delete(key)
}

export function serializePrFilters(v: PRListFilterValues, params: URLSearchParams): void {
  setTrimmed(params, 'prNumber', v.prNumber)
  setTrimmed(params, 'search', v.search)
  setTrimmed(params, 'requesterName', v.requesterName)
  // DateField emits ISO, so no trimming needed here
  if (v.from) params.set('from', v.from)
  else params.delete('from')
  if (v.to) params.set('to', v.to)
  else params.delete('to')
  if (v.status && v.status !== 'all') params.set('status', v.status)
  else params.delete('status')
}

export const prUrlFilterConfig: UrlFilterConfig<PRListFilterValues> = {
  defaults: DEFAULT_PR_FILTERS,
  parse: parsePrFilters,
  serialize: serializePrFilters,
  // resetPage defaults to true — PRListPage is paginated
}
