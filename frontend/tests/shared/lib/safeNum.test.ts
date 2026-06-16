import { describe, it, expect } from 'vitest'
import { safeNum } from '@/shared/lib/safeNum'

describe('safeNum', () => {
  it('parses a valid numeric string', () => {
    expect(safeNum('12.5')).toBe(12.5)
    expect(safeNum('0')).toBe(0)
  })

  it('returns 0 for non-numeric / empty / undefined input', () => {
    expect(safeNum('abc')).toBe(0)
    expect(safeNum('')).toBe(0)
    expect(safeNum(undefined)).toBe(0)
  })

  it('passes through a finite number input unchanged', () => {
    expect(safeNum(3000000)).toBe(3000000)
    expect(safeNum(0)).toBe(0)
  })

  it('collapses non-finite values to 0 (Infinity / NaN / overflow string)', () => {
    expect(safeNum('1e999')).toBe(0) // Number('1e999') === Infinity
    expect(safeNum(Infinity)).toBe(0)
    expect(safeNum(-Infinity)).toBe(0)
    expect(safeNum(NaN)).toBe(0)
  })
})
