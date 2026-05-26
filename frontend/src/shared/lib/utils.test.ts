import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime } from './utils'

describe('formatCurrency', () => {
  it('formats positive number as THB currency', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1,234.56')
    expect(result).toContain('฿')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })
})

describe('formatDate', () => {
  it('formats ISO date string to Thai locale date', () => {
    const result = formatDate('2025-01-15T00:00:00.000Z')
    expect(result).toMatch(/ม\.ค\.|Jan|15/)
  })
})

describe('formatDateTime', () => {
  it('includes both date and time', () => {
    const result = formatDateTime('2025-06-01T10:30:00.000Z')
    expect(result).toMatch(/2568|2025/)
    expect(result).toMatch(/\d{2}:\d{2}/)
  })
})
