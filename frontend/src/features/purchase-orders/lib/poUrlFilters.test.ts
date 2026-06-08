import { describe, it, expect } from 'vitest'
import { parsePoFilters, serializePoFilters, poUrlFilterConfig, DEFAULT_PO_FILTERS } from './poUrlFilters'

describe('parsePoFilters', () => {
  it('returns defaults when no params are present', () => {
    expect(parsePoFilters(new URLSearchParams())).toEqual(DEFAULT_PO_FILTERS)
  })

  it('keeps a known status and falls back to all for an unknown one', () => {
    expect(parsePoFilters(new URLSearchParams('status=sent')).status).toBe('sent')
    expect(parsePoFilters(new URLSearchParams('status=partially_received')).status).toBe(
      'partially_received',
    )
    expect(parsePoFilters(new URLSearchParams('status=bogus')).status).toBe('all')
  })

  it('keeps a numeric vendorId and falls back to all for a non-numeric one', () => {
    expect(parsePoFilters(new URLSearchParams('vendorId=8')).vendorId).toBe('8')
    expect(parsePoFilters(new URLSearchParams('vendorId=abc')).vendorId).toBe('all')
    expect(parsePoFilters(new URLSearchParams('vendorId=-1')).vendorId).toBe('all')
  })
})

describe('serializePoFilters', () => {
  it('writes nothing for all-default values', () => {
    const p = new URLSearchParams()
    serializePoFilters(DEFAULT_PO_FILTERS, p)
    expect(p.toString()).toBe('')
  })

  it('round-trips real values back through parse', () => {
    const p = new URLSearchParams()
    serializePoFilters({ status: 'sent', vendorId: '8' }, p)
    expect(p.get('status')).toBe('sent')
    expect(p.get('vendorId')).toBe('8')
    expect(parsePoFilters(p)).toEqual({ status: 'sent', vendorId: '8' })
  })

  it('deletes a key when its value reverts to default (idempotent set/delete)', () => {
    const p = new URLSearchParams('status=sent&vendorId=8')
    serializePoFilters(DEFAULT_PO_FILTERS, p)
    expect(p.toString()).toBe('')
  })
})

describe('poUrlFilterConfig', () => {
  it('is paginated: does not opt out of page reset (resetPage stays default)', () => {
    expect(poUrlFilterConfig.resetPage).toBeUndefined()
  })
})
