import { describe, it, expect } from 'vitest'
import { rateVendorSchema } from '@/features/purchase-orders/lib/rateVendorSchema'

describe('rateVendorSchema', () => {
  it('accepts score 1-5 with optional comment', () => {
    expect(rateVendorSchema.safeParse({ score: 1 }).success).toBe(true)
    expect(rateVendorSchema.safeParse({ score: 5, comment: 'ดี' }).success).toBe(true)
  })

  it('rejects score 0, 6 and non-integer', () => {
    expect(rateVendorSchema.safeParse({ score: 0 }).success).toBe(false)
    expect(rateVendorSchema.safeParse({ score: 6 }).success).toBe(false)
    expect(rateVendorSchema.safeParse({ score: 3.5 }).success).toBe(false)
  })

  it('requires score and rejects a non-string comment', () => {
    expect(rateVendorSchema.safeParse({}).success).toBe(false)
    expect(rateVendorSchema.safeParse({ score: 4, comment: 123 }).success).toBe(false)
  })
})
