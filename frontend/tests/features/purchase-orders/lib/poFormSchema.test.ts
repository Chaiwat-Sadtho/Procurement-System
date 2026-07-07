import { describe, it, expect } from 'vitest'
import {
  poFormSchema,
  toCreatePayload,
  toUpdatePayload,
  poToFormValues,
  emptyItem,
  createDefaultValues,
  safeNum,
  type POFormValues,
} from '@/features/purchase-orders/lib/poFormSchema'
import type { PurchaseOrder } from '@/features/purchase-orders/types'

const validValues: POFormValues = {
  prId: 7,
  vendorId: 3,
  expectedDeliveryDate: '2026-07-15',
  notes: 'ส่งที่ชั้น 5',
  items: [{ prItemId: 11, itemName: 'กระดาษ A4', quantity: '10', unit: 'รีม', unitPrice: '120.5' }],
}

describe('poFormSchema', () => {
  it('accepts valid values', () => {
    expect(poFormSchema.safeParse(validValues).success).toBe(true)
  })

  it('accepts an item without prItemId (free-text line)', () => {
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ itemName: 'ปากกา', quantity: '5', unit: 'ด้าม', unitPrice: '15' }],
      }).success,
    ).toBe(true)
  })

  it('requires prId / vendorId to be positive', () => {
    expect(poFormSchema.safeParse({ ...validValues, prId: 0 }).success).toBe(false)
    expect(poFormSchema.safeParse({ ...validValues, vendorId: 0 }).success).toBe(false)
  })

  it('requires expectedDeliveryDate', () => {
    expect(poFormSchema.safeParse({ ...validValues, expectedDeliveryDate: '' }).success).toBe(false)
  })

  it('treats notes as optional', () => {
    const { notes, ...withoutNotes } = validValues
    void notes
    expect(poFormSchema.safeParse(withoutNotes).success).toBe(true)
  })

  it('rejects empty itemName / unit', () => {
    expect(
      poFormSchema.safeParse({ ...validValues, items: [{ ...validValues.items[0], itemName: '' }] })
        .success,
    ).toBe(false)
    expect(
      poFormSchema.safeParse({ ...validValues, items: [{ ...validValues.items[0], unit: '' }] })
        .success,
    ).toBe(false)
  })

  it('rejects itemName over 255 / unit over 50 chars', () => {
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], itemName: 'a'.repeat(256) }],
      }).success,
    ).toBe(false)
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], unit: 'a'.repeat(51) }],
      }).success,
    ).toBe(false)
  })

  it('rejects quantity below 0.01 and accepts decimals', () => {
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '0' }],
      }).success,
    ).toBe(false)
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '0.009' }],
      }).success,
    ).toBe(false)
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '2.5' }],
      }).success,
    ).toBe(true)
  })

  it('rejects negative unitPrice, accepts 0', () => {
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], unitPrice: '-1' }],
      }).success,
    ).toBe(false)
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], unitPrice: '0' }],
      }).success,
    ).toBe(true)
  })

  // '1e999' parses to Infinity, which passed the bare `>= 0.01` / `>= 0` refines and then
  // serialized to null in JSON.stringify (backend then 400s). The schema must reject non-finite
  // input FE-side with a clear message instead of leaking Infinity into the payload.
  it('rejects non-finite quantity (1e999 -> Infinity)', () => {
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], quantity: '1e999' }],
      }).success,
    ).toBe(false)
  })

  it('rejects non-finite unitPrice (1e999 -> Infinity)', () => {
    expect(
      poFormSchema.safeParse({
        ...validValues,
        items: [{ ...validValues.items[0], unitPrice: '1e999' }],
      }).success,
    ).toBe(false)
  })

  it('requires at least one item', () => {
    expect(poFormSchema.safeParse({ ...validValues, items: [] }).success).toBe(false)
  })
})

describe('toCreatePayload', () => {
  it('builds the create body: numbers coerced, item trimmed, notes kept', () => {
    expect(toCreatePayload(validValues)).toEqual({
      prId: 7,
      vendorId: 3,
      expectedDeliveryDate: '2026-07-15',
      notes: 'ส่งที่ชั้น 5',
      items: [{ prItemId: 11, itemName: 'กระดาษ A4', quantity: 10, unit: 'รีม', unitPrice: 120.5 }],
    })
  })

  it('omits prItemId when absent and omits notes when blank/whitespace', () => {
    const out = toCreatePayload({
      ...validValues,
      notes: '   ',
      items: [{ itemName: 'ปากกา', quantity: '5', unit: 'ด้าม', unitPrice: '15' }],
    })
    expect('notes' in out).toBe(false)
    expect('prItemId' in out.items[0]).toBe(false)
    expect(out.items[0]).toEqual({ itemName: 'ปากกา', quantity: 5, unit: 'ด้าม', unitPrice: 15 })
  })
})

describe('toUpdatePayload', () => {
  it('omits prId / vendorId entirely (immutable on draft edit)', () => {
    const out = toUpdatePayload(validValues)
    expect('prId' in out).toBe(false)
    expect('vendorId' in out).toBe(false)
    expect(out).toEqual({
      expectedDeliveryDate: '2026-07-15',
      notes: 'ส่งที่ชั้น 5',
      items: [{ prItemId: 11, itemName: 'กระดาษ A4', quantity: 10, unit: 'รีม', unitPrice: 120.5 }],
    })
  })

  // M5: เคลียร์ notes ตอน edit ต้องส่ง null (omit = BE ไม่แตะ field → ค่าเก่าค้าง)
  it('sends notes: null when blank so the backend clears the stored value', () => {
    expect(toUpdatePayload({ ...validValues, notes: '' }).notes).toBeNull()
    expect(toUpdatePayload({ ...validValues, notes: '   ' }).notes).toBeNull()
  })
})

describe('poToFormValues', () => {
  const po = {
    id: 1,
    poNumber: 'PO-2026-0001',
    prId: 7,
    vendorId: 3,
    status: 'draft',
    totalAmount: '1205.00',
    expectedDeliveryDate: '2026-07-15',
    actualDeliveryDate: null,
    notes: null,
    items: [
      {
        id: 21,
        poId: 1,
        prItemId: 11,
        itemName: 'กระดาษ A4',
        quantity: '10.00',
        unit: 'รีม',
        unitPrice: '120.50',
        totalPrice: '1205.00',
        receivedQuantity: '0.00',
      },
      {
        id: 22,
        poId: 1,
        prItemId: null,
        itemName: 'ปากกา',
        quantity: '5.00',
        unit: 'ด้าม',
        unitPrice: '15.00',
        totalPrice: '75.00',
        receivedQuantity: '0.00',
      },
    ],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  } as unknown as PurchaseOrder

  it('prefills ids, date, normalizes notes null -> empty string, stringifies decimals', () => {
    const v = poToFormValues(po)
    expect(v.prId).toBe(7)
    expect(v.vendorId).toBe(3)
    expect(v.expectedDeliveryDate).toBe('2026-07-15')
    expect(v.notes).toBe('')
    expect(v.items[0]).toEqual({
      prItemId: 11,
      itemName: 'กระดาษ A4',
      quantity: '10',
      unit: 'รีม',
      unitPrice: '120.5',
    })
  })

  it('drops prItemId key when item.prItemId is null', () => {
    const v = poToFormValues(po)
    expect('prItemId' in v.items[1]).toBe(false)
  })
})

describe('helpers', () => {
  it('emptyItem returns one blank line with quantity 1 and price 0', () => {
    expect(emptyItem()).toEqual({ itemName: '', quantity: '1', unit: '', unitPrice: '0' })
  })

  it('createDefaultValues has blank ids/date/notes and a single empty item', () => {
    const d = createDefaultValues()
    expect(d.prId).toBe(0)
    expect(d.vendorId).toBe(0)
    expect(d.expectedDeliveryDate).toBe('')
    expect(d.notes).toBe('')
    expect(d.items).toHaveLength(1)
    expect(d.items[0]).toEqual({ itemName: '', quantity: '1', unit: '', unitPrice: '0' })
  })

  it('safeNum returns 0 for non-numeric, parses valid', () => {
    expect(safeNum('abc')).toBe(0)
    expect(safeNum('')).toBe(0)
    expect(safeNum(undefined)).toBe(0)
    expect(safeNum('12.5')).toBe(12.5)
  })
})
