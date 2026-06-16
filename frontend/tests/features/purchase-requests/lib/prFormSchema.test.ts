import { describe, it, expect } from 'vitest'
import {
  prFormSchema,
  toCreatePayload,
  toUpdatePayload,
  prToFormValues,
  createDefaultValues,
  safeNum,
  type PRFormValues,
} from '@/features/purchase-requests/lib/prFormSchema'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

const validValues: PRFormValues = {
  title: 'กระดาษ A4',
  requiredDate: '2026-07-01',
  period: '2',
  items: [
    {
      itemName: 'กระดาษ',
      description: 'A4 80 แกรม',
      quantity: '10',
      unit: 'รีม',
      estimatedUnitPrice: '120.5',
    },
  ],
}

describe('prFormSchema', () => {
  it('accepts valid values', () => {
    expect(prFormSchema.safeParse(validValues).success).toBe(true)
  })

  it('rejects empty title / requiredDate / itemName / unit', () => {
    expect(prFormSchema.safeParse({ ...validValues, title: '' }).success).toBe(false)
    expect(prFormSchema.safeParse({ ...validValues, requiredDate: '' }).success).toBe(false)
    expect(
      prFormSchema.safeParse({ ...validValues, items: [{ ...validValues.items[0], itemName: '' }] })
        .success,
    ).toBe(false)
    expect(
      prFormSchema.safeParse({ ...validValues, items: [{ ...validValues.items[0], unit: '' }] })
        .success,
    ).toBe(false)
  })

  it('rejects quantity <= 0 and accepts decimals', () => {
    expect(
      prFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '0' }],
      }).success,
    ).toBe(false)
    expect(
      prFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '-1' }],
      }).success,
    ).toBe(false)
    expect(
      prFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '2.5' }],
      }).success,
    ).toBe(true)
  })

  it('rejects negative unit price, accepts 0', () => {
    expect(
      prFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], estimatedUnitPrice: '-1' }],
      }).success,
    ).toBe(false)
    expect(
      prFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], estimatedUnitPrice: '0' }],
      }).success,
    ).toBe(true)
  })

  // '1e999' parses to Infinity, which passed the bare `>= 0.01` / `>= 0` refines and then serialized
  // to null in JSON.stringify (backend then 400s). Same gap as poFormSchema — reject non-finite input
  // FE-side instead of leaking Infinity into the mapped payload.
  it('rejects non-finite quantity (1e999 -> Infinity)', () => {
    expect(
      prFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '1e999' }],
      }).success,
    ).toBe(false)
  })

  it('rejects non-finite estimatedUnitPrice (1e999 -> Infinity)', () => {
    expect(
      prFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], estimatedUnitPrice: '1e999' }],
      }).success,
    ).toBe(false)
  })

  it('requires at least one item', () => {
    expect(prFormSchema.safeParse({ ...validValues, items: [] }).success).toBe(false)
  })
})

describe('mappers', () => {
  it('toCreatePayload converts strings to numbers, period 2 -> quarter 2, trims', () => {
    expect(toCreatePayload(validValues)).toEqual({
      title: 'กระดาษ A4',
      requiredDate: '2026-07-01',
      quarter: 2,
      items: [
        {
          itemName: 'กระดาษ',
          description: 'A4 80 แกรม',
          quantity: 10,
          unit: 'รีม',
          estimatedUnitPrice: 120.5,
        },
      ],
    })
  })

  it('period annual -> quarter null', () => {
    expect(toCreatePayload({ ...validValues, period: 'annual' }).quarter).toBeNull()
  })

  it('omits empty description (undefined, not empty string)', () => {
    const out = toCreatePayload({
      ...validValues,
      items: [{ ...validValues.items[0], description: '   ' }],
    })
    expect(out.items[0].description).toBeUndefined()
  })

  it('toUpdatePayload omits quarter entirely', () => {
    const out = toUpdatePayload(validValues)
    expect('quarter' in out).toBe(false)
    expect(out).toEqual({
      title: 'กระดาษ A4',
      requiredDate: '2026-07-01',
      items: [
        {
          itemName: 'กระดาษ',
          description: 'A4 80 แกรม',
          quantity: 10,
          unit: 'รีม',
          estimatedUnitPrice: 120.5,
        },
      ],
    })
  })
})

describe('prToFormValues', () => {
  const pr = {
    id: 1,
    title: 'ของเก่า',
    requiredDate: '2026-08-15',
    quarter: 3,
    items: [
      {
        id: 1,
        prId: 1,
        itemName: 'หมึก',
        description: null,
        quantity: 5,
        unit: 'กล่อง',
        estimatedUnitPrice: 300,
        estimatedTotalPrice: 1500,
      },
    ],
  } as unknown as PurchaseRequest

  it('prefills period from quarter and stringifies numbers', () => {
    const v = prToFormValues(pr)
    expect(v.period).toBe('3')
    expect(v.title).toBe('ของเก่า')
    expect(v.items[0]).toEqual({
      itemName: 'หมึก',
      description: '',
      quantity: '5',
      unit: 'กล่อง',
      estimatedUnitPrice: '300',
    })
  })

  it('quarter null -> period annual', () => {
    expect(prToFormValues({ ...pr, quarter: null }).period).toBe('annual')
  })
})

describe('helpers', () => {
  it('createDefaultValues has one empty item and annual period', () => {
    const d = createDefaultValues()
    expect(d.period).toBe('annual')
    expect(d.items).toHaveLength(1)
    expect(d.title).toBe('')
  })

  it('safeNum returns 0 for non-numeric', () => {
    expect(safeNum('abc')).toBe(0)
    expect(safeNum('')).toBe(0)
    expect(safeNum(undefined)).toBe(0)
    expect(safeNum('12.5')).toBe(12.5)
  })
})
