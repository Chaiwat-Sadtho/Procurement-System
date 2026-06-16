import { describe, it, expect } from 'vitest'
import {
  vendorFormSchema,
  toVendorPayload,
  vendorToFormValues,
  createDefaultValues,
  type VendorFormValues,
} from '@/features/vendors/lib/vendorFormSchema'
import type { Vendor } from '@/features/vendors/types'

const validValues: VendorFormValues = {
  name: 'บริษัท ไอทีซัพพลาย จำกัด',
  taxId: '0105563123456',
  email: 'contact@itsupply.co.th',
  phone: '021234567',
  address: '123 ถนนสุขุมวิท',
  categoryIds: [1, 2],
}

describe('vendorFormSchema', () => {
  it('accepts valid values', () => {
    expect(vendorFormSchema.safeParse(validValues).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(vendorFormSchema.safeParse({ ...validValues, name: '' }).success).toBe(false)
  })

  it('rejects name over 255 chars', () => {
    expect(vendorFormSchema.safeParse({ ...validValues, name: 'a'.repeat(256) }).success).toBe(
      false,
    )
  })

  it('accepts empty optional fields (taxId/email/phone/address blank)', () => {
    expect(
      vendorFormSchema.safeParse({
        name: 'X',
        taxId: '',
        email: '',
        phone: '',
        address: '',
        categoryIds: [],
      }).success,
    ).toBe(true)
  })

  it('rejects a malformed email but accepts a blank one', () => {
    expect(vendorFormSchema.safeParse({ ...validValues, email: 'not-an-email' }).success).toBe(
      false,
    )
    expect(vendorFormSchema.safeParse({ ...validValues, email: '' }).success).toBe(true)
  })

  it('rejects taxId/phone over 20 chars', () => {
    expect(vendorFormSchema.safeParse({ ...validValues, taxId: '1'.repeat(21) }).success).toBe(
      false,
    )
    expect(vendorFormSchema.safeParse({ ...validValues, phone: '1'.repeat(21) }).success).toBe(
      false,
    )
  })

  it('parses an explicit categoryIds array', () => {
    const parsed = vendorFormSchema.parse({
      name: 'X',
      taxId: '',
      email: '',
      phone: '',
      address: '',
      categoryIds: [3, 4],
    })
    expect(parsed.categoryIds).toEqual([3, 4])
  })

  it('requires categoryIds to be present (form always supplies it — no zod default)', () => {
    expect(
      vendorFormSchema.safeParse({ name: 'X', taxId: '', email: '', phone: '', address: '' })
        .success,
    ).toBe(false)
  })
})

describe('toVendorPayload', () => {
  it('maps blank optionals to null and trims, keeps categoryIds as-is', () => {
    expect(
      toVendorPayload({
        name: '  ACME  ',
        taxId: '  ',
        email: '',
        phone: '  ',
        address: '',
        categoryIds: [3],
      }),
    ).toEqual({
      name: 'ACME',
      taxId: null,
      email: null,
      phone: null,
      address: null,
      categoryIds: [3],
    })
  })

  it('keeps filled optionals (trimmed)', () => {
    expect(toVendorPayload(validValues)).toEqual({
      name: 'บริษัท ไอทีซัพพลาย จำกัด',
      taxId: '0105563123456',
      email: 'contact@itsupply.co.th',
      phone: '021234567',
      address: '123 ถนนสุขุมวิท',
      categoryIds: [1, 2],
    })
  })
})

describe('vendorToFormValues', () => {
  const vendor = {
    id: 1,
    name: 'ACME',
    taxId: null,
    email: null,
    phone: '021112222',
    address: null,
    isBlacklisted: false,
    blacklistReason: null,
    ratingAvg: '4.50',
    categories: [
      { id: 2, name: 'Software' },
      { id: 5, name: 'Services' },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as Vendor

  it('maps null fields to empty strings and categories to id array', () => {
    expect(vendorToFormValues(vendor)).toEqual({
      name: 'ACME',
      taxId: '',
      email: '',
      phone: '021112222',
      address: '',
      categoryIds: [2, 5],
    })
  })
})

describe('createDefaultValues', () => {
  it('returns all blank strings and an empty categoryIds array', () => {
    expect(createDefaultValues()).toEqual({
      name: '',
      taxId: '',
      email: '',
      phone: '',
      address: '',
      categoryIds: [],
    })
  })
})
