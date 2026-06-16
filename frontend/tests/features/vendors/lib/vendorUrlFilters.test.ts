import { describe, it, expect } from 'vitest'
import {
  parseVendorFilters,
  serializeVendorFilters,
  DEFAULT_VENDOR_FILTERS,
} from '@/features/vendors/lib/vendorUrlFilters'

describe('parseVendorFilters', () => {
  it('returns defaults when no params are present', () => {
    expect(parseVendorFilters(new URLSearchParams())).toEqual(DEFAULT_VENDOR_FILTERS)
  })

  it('keeps a valid isBlacklisted (true/false) and falls back to all otherwise', () => {
    expect(parseVendorFilters(new URLSearchParams('isBlacklisted=true')).isBlacklisted).toBe('true')
    expect(parseVendorFilters(new URLSearchParams('isBlacklisted=false')).isBlacklisted).toBe('false')
    expect(parseVendorFilters(new URLSearchParams('isBlacklisted=xyz')).isBlacklisted).toBe('all')
  })

  it('keeps a numeric categoryId and falls back to all for non-numeric', () => {
    expect(parseVendorFilters(new URLSearchParams('categoryId=3')).categoryId).toBe('3')
    expect(parseVendorFilters(new URLSearchParams('categoryId=abc')).categoryId).toBe('all')
  })

  it('reads search verbatim (no trim on parse)', () => {
    expect(parseVendorFilters(new URLSearchParams('search=acme')).search).toBe('acme')
  })
})

describe('serializeVendorFilters', () => {
  it('writes nothing for all-default values', () => {
    const p = new URLSearchParams()
    serializeVendorFilters(DEFAULT_VENDOR_FILTERS, p)
    expect(p.toString()).toBe('')
  })

  it('round-trips real values back through parse', () => {
    const p = new URLSearchParams()
    serializeVendorFilters({ search: 'acme', isBlacklisted: 'true', categoryId: '3' }, p)
    expect(p.get('search')).toBe('acme')
    expect(p.get('isBlacklisted')).toBe('true')
    expect(p.get('categoryId')).toBe('3')
    expect(parseVendorFilters(p)).toEqual({ search: 'acme', isBlacklisted: 'true', categoryId: '3' })
  })

  it('trims search: whitespace-only drops the key, padded value is trimmed', () => {
    const empty = new URLSearchParams()
    serializeVendorFilters({ search: '   ', isBlacklisted: 'all', categoryId: 'all' }, empty)
    expect(empty.has('search')).toBe(false)

    const padded = new URLSearchParams()
    serializeVendorFilters({ search: '  acme  ', isBlacklisted: 'all', categoryId: 'all' }, padded)
    expect(padded.get('search')).toBe('acme')
  })

  it('deletes a key when its value reverts to default (idempotent set/delete)', () => {
    const p = new URLSearchParams('search=old&isBlacklisted=true&categoryId=3')
    serializeVendorFilters(DEFAULT_VENDOR_FILTERS, p)
    expect(p.toString()).toBe('')
  })
})
