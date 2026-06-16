import { describe, it, expect } from 'vitest'
import {
  parsePrFilters,
  serializePrFilters,
  prUrlFilterConfig,
  DEFAULT_PR_FILTERS,
} from '@/features/purchase-requests/lib/prUrlFilters'

describe('parsePrFilters', () => {
  it('returns defaults when no params are present', () => {
    expect(parsePrFilters(new URLSearchParams())).toEqual(DEFAULT_PR_FILTERS)
  })

  it('keeps a filterable status and falls back to all for an unknown one', () => {
    expect(parsePrFilters(new URLSearchParams('status=draft')).status).toBe('draft')
    expect(parsePrFilters(new URLSearchParams('status=approved')).status).toBe('approved')
    expect(parsePrFilters(new URLSearchParams('status=bogus')).status).toBe('all')
  })

  it('falls back to all for under_review (a PR status the filter form does not offer)', () => {
    expect(parsePrFilters(new URLSearchParams('status=under_review')).status).toBe('all')
  })

  it('reads text fields verbatim (no trim on parse)', () => {
    const p = new URLSearchParams(
      'prNumber=PR-2026-0001&search=office&requesterName=somchai',
    )
    const r = parsePrFilters(p)
    expect(r.prNumber).toBe('PR-2026-0001')
    expect(r.search).toBe('office')
    expect(r.requesterName).toBe('somchai')
  })

  it('reads from/to dates verbatim', () => {
    const r = parsePrFilters(new URLSearchParams('from=2026-01-01&to=2026-12-31'))
    expect(r.from).toBe('2026-01-01')
    expect(r.to).toBe('2026-12-31')
  })
})

describe('serializePrFilters', () => {
  it('writes nothing for all-default values', () => {
    const p = new URLSearchParams()
    serializePrFilters(DEFAULT_PR_FILTERS, p)
    expect(p.toString()).toBe('')
  })

  it('round-trips real values back through parse', () => {
    const p = new URLSearchParams()
    const values = {
      prNumber: 'PR-2026-0001',
      search: 'office',
      from: '2026-01-01',
      to: '2026-12-31',
      requesterName: 'somchai',
      status: 'approved',
    }
    serializePrFilters(values, p)
    expect(parsePrFilters(p)).toEqual(values)
  })

  it('trims text fields: whitespace-only drops the key, padded value is trimmed', () => {
    const empty = new URLSearchParams()
    serializePrFilters({ ...DEFAULT_PR_FILTERS, search: '   ', requesterName: '  ' }, empty)
    expect(empty.has('search')).toBe(false)
    expect(empty.has('requesterName')).toBe(false)

    const padded = new URLSearchParams()
    serializePrFilters({ ...DEFAULT_PR_FILTERS, prNumber: '  PR-1  ', search: '  office  ' }, padded)
    expect(padded.get('prNumber')).toBe('PR-1')
    expect(padded.get('search')).toBe('office')
  })

  it('writes from/to dates when present', () => {
    const p = new URLSearchParams()
    serializePrFilters({ ...DEFAULT_PR_FILTERS, from: '2026-01-01', to: '2026-12-31' }, p)
    expect(p.get('from')).toBe('2026-01-01')
    expect(p.get('to')).toBe('2026-12-31')
  })

  it('deletes a key when its value reverts to default (idempotent set/delete)', () => {
    const p = new URLSearchParams(
      'prNumber=old&search=x&from=2026-01-01&to=2026-12-31&requesterName=y&status=draft',
    )
    serializePrFilters(DEFAULT_PR_FILTERS, p)
    expect(p.toString()).toBe('')
  })
})

describe('prUrlFilterConfig', () => {
  it('is paginated: does not opt out of page reset (resetPage stays default)', () => {
    expect(prUrlFilterConfig.resetPage).toBeUndefined()
  })
})
