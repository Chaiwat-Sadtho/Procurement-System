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

// The filter form's status Select offers a SUBSET of PRStatus (no under_review),
// so the URL's valid status set mirrors the form, not the entity enum — a URL
// status the form cannot display would round-trip into a blank Select. Partial<>
// allows the subset while still rejecting any key that is not a real PRStatus
// (typo guard); adding a status the form should filter by means adding it here.
const PR_FILTER_STATUS_FLAGS = {
  draft: true,
  submitted: true,
  approved: true,
  rejected: true,
} satisfies Partial<Record<PRStatus, true>>
const VALID_PR_STATUS = new Set<string>(Object.keys(PR_FILTER_STATUS_FLAGS))

export function parsePrFilters(params: URLSearchParams): PRListFilterValues {
  const rawStatus = params.get('status')
  // status is a closed (filterable) enum → keep only a known value, else 'all'
  const status = rawStatus && VALID_PR_STATUS.has(rawStatus) ? rawStatus : 'all'
  // text + date fields read verbatim (no trim) — serialize trims to canonical form;
  // dates stay lenient (the form re-validates on submit, URL scrub is out of scope)
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
  // dates carry no whitespace (DateField emits ISO) → set when present, else delete
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
  // no resetPage → default true (PRListPage is paginated via usePagination)
}
