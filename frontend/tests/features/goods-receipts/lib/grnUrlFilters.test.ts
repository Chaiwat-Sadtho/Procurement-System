import { describe, it, expect } from 'vitest'
import {
  parseGrnFilters,
  serializeGrnFilters,
  grnUrlFilterConfig,
  DEFAULT_GRN_FILTERS,
} from '@/features/goods-receipts/lib/grnUrlFilters'

describe('parseGrnFilters', () => {
  it('returns defaults when no params are present', () => {
    expect(parseGrnFilters(new URLSearchParams())).toEqual(DEFAULT_GRN_FILTERS)
  })

  it('keeps a known status and falls back to all for an unknown one', () => {
    expect(parseGrnFilters(new URLSearchParams('status=partial')).status).toBe('partial')
    expect(parseGrnFilters(new URLSearchParams('status=complete')).status).toBe('complete')
    expect(parseGrnFilters(new URLSearchParams('status=bogus')).status).toBe('all')
  })

  it('keeps a numeric poId and falls back to all for a non-numeric one', () => {
    expect(parseGrnFilters(new URLSearchParams('poId=8')).poId).toBe('8')
    expect(parseGrnFilters(new URLSearchParams('poId=abc')).poId).toBe('all')
    expect(parseGrnFilters(new URLSearchParams('poId=-1')).poId).toBe('all')
  })
})

describe('serializeGrnFilters', () => {
  it('writes nothing for all-default values', () => {
    const p = new URLSearchParams()
    serializeGrnFilters(DEFAULT_GRN_FILTERS, p)
    expect(p.toString()).toBe('')
  })

  it('round-trips real values back through parse', () => {
    const p = new URLSearchParams()
    serializeGrnFilters({ status: 'complete', poId: '8' }, p)
    expect(p.get('status')).toBe('complete')
    expect(p.get('poId')).toBe('8')
    expect(parseGrnFilters(p)).toEqual({ status: 'complete', poId: '8' })
  })

  it('deletes a key when its value reverts to default (idempotent set/delete)', () => {
    const p = new URLSearchParams('status=complete&poId=8')
    serializeGrnFilters(DEFAULT_GRN_FILTERS, p)
    expect(p.toString()).toBe('')
  })
})

describe('grnUrlFilterConfig', () => {
  it('is paginated: does not opt out of page reset (resetPage stays default)', () => {
    expect(grnUrlFilterConfig.resetPage).toBeUndefined()
  })
})
