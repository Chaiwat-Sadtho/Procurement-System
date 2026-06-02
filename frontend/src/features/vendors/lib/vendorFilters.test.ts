import { describe, it, expect } from 'vitest'
import { toIsBlacklistedParam, toCategoryIdParam, formatRating } from './vendorFilters'

describe('toIsBlacklistedParam (tri-state)', () => {
  it("maps 'all' to undefined", () => {
    expect(toIsBlacklistedParam('all')).toBeUndefined()
  })
  it('maps undefined to undefined', () => {
    expect(toIsBlacklistedParam(undefined)).toBeUndefined()
  })
  it("maps 'true' to true", () => {
    expect(toIsBlacklistedParam('true')).toBe(true)
  })
  it("maps 'false' to false (must NOT be dropped)", () => {
    expect(toIsBlacklistedParam('false')).toBe(false)
  })
})

describe('toCategoryIdParam', () => {
  it("maps 'all' to undefined", () => {
    expect(toCategoryIdParam('all')).toBeUndefined()
  })
  it('maps empty string to undefined', () => {
    expect(toCategoryIdParam('')).toBeUndefined()
  })
  it('maps undefined to undefined', () => {
    expect(toCategoryIdParam(undefined)).toBeUndefined()
  })
  it('maps a numeric string to a number', () => {
    expect(toCategoryIdParam('5')).toBe(5)
  })
})

describe('formatRating', () => {
  it('formats a decimal string to one decimal place', () => {
    expect(formatRating('4.50')).toBe('4.5')
  })
  it('returns em dash for null', () => {
    expect(formatRating(null)).toBe('—')
  })
})
