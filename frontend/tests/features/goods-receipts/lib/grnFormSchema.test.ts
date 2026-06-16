import { describe, it, expect } from 'vitest'
import {
  grnFormSchema,
  toCreatePayload,
  createDefaultValues,
  safeNum,
  type GrnFormValues,
} from '@/features/goods-receipts/lib/grnFormSchema'
import type { PurchaseOrder } from '@/features/purchase-orders/types'

// one fully-receivable line: ordered 10, none received yet → remaining 10
function line(over: Partial<GrnFormValues['items'][number]> = {}): GrnFormValues['items'][number] {
  return {
    poItemId: 11,
    itemName: 'กระดาษ A4',
    ordered: 10,
    alreadyReceived: 0,
    remaining: 10,
    good: '10',
    damaged: '0',
    ...over,
  }
}

function values(over: Partial<GrnFormValues> = {}): GrnFormValues {
  return {
    poId: 1,
    receivedDate: '2026-06-03',
    notes: '',
    items: [line()],
    ...over,
  }
}

describe('safeNum', () => {
  it('returns 0 for non-numeric / empty / undefined, parses valid', () => {
    expect(safeNum('abc')).toBe(0)
    expect(safeNum('')).toBe(0)
    expect(safeNum(undefined)).toBe(0)
    expect(safeNum('12.5')).toBe(12.5)
  })
})

describe('grnFormSchema', () => {
  it('accepts a valid receive (good within remaining)', () => {
    expect(grnFormSchema.safeParse(values()).success).toBe(true)
  })

  it('requires poId to be > 0 (no PO selected)', () => {
    expect(grnFormSchema.safeParse(values({ poId: 0 })).success).toBe(false)
  })

  it('requires receivedDate', () => {
    expect(grnFormSchema.safeParse(values({ receivedDate: '' })).success).toBe(false)
  })

  it('treats notes as optional', () => {
    const v = values()
    delete (v as { notes?: string }).notes
    expect(grnFormSchema.safeParse(v).success).toBe(true)
  })

  it('rejects negative good', () => {
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '-1', damaged: '0' })] })).success,
    ).toBe(false)
  })

  it('rejects negative damaged', () => {
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '0', damaged: '-1' })] })).success,
    ).toBe(false)
  })

  it('rejects good + damaged exceeding remaining (FE-bound stricter than backend)', () => {
    // remaining 10, good 7 + damaged 4 = 11 > 10
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '7', damaged: '4' })] })).success,
    ).toBe(false)
  })

  it('accepts good + damaged exactly equal to remaining', () => {
    // remaining 10, good 6 + damaged 4 = 10
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '6', damaged: '4' })] })).success,
    ).toBe(true)
  })

  it('treats blank good/damaged as 0 (no emitted item from this line)', () => {
    // single line both blank → form-level refine should fail (no emitted item), proving blanks coerce to 0
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '', damaged: '' })] })).success,
    ).toBe(false)
  })

  it('rejects when no line has any quantity (ArrayMinSize 1 — zero emitted DTO items)', () => {
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '0', damaged: '0' })] })).success,
    ).toBe(false)
  })

  it('rejects when items array is empty (no emitted item)', () => {
    expect(grnFormSchema.safeParse(values({ items: [] })).success).toBe(false)
  })

  it('accepts a multi-line receive where only one line has quantity', () => {
    const ok = values({
      items: [
        line({ poItemId: 11, good: '0', damaged: '0' }),
        line({ poItemId: 12, itemName: 'ปากกา', good: '5', damaged: '0' }),
      ],
    })
    expect(grnFormSchema.safeParse(ok).success).toBe(true)
  })

  // emitted-check must mirror the mapper's 0.01 floor: a sub-0.01 value would map to an
  // empty items[] that the backend rejects via @ArrayMinSize(1) — so the schema must reject it FE-side.
  it('rejects a line whose only quantity is below the 0.01 floor (good 0.005)', () => {
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '0.005', damaged: '0' })] })).success,
    ).toBe(false)
  })

  it('rejects a line whose only quantity is below the 0.01 floor (damaged 0.005)', () => {
    expect(
      grnFormSchema.safeParse(values({ items: [line({ good: '0', damaged: '0.005' })] })).success,
    ).toBe(false)
  })

  // Regression lock: unlike poFormSchema, every numeric read here flows through safeNum, whose
  // Number.isFinite guard collapses '1e999' (Infinity) to 0. So a non-finite value never reaches the
  // bound check — the line emits nothing and the form fails on the EMITTED refine (not the bound). We
  // assert the emitted-refine message specifically: if safeNum lost its guard, Infinity would survive,
  // trip the `> remaining` bound instead, and this message assertion would fail before Infinity leaks.
  it('coerces a non-finite good (1e999 -> Infinity -> 0) so the only line fails the emitted refine, not the bound', () => {
    const result = grnFormSchema.safeParse(
      values({ items: [line({ good: '1e999', damaged: '0' })] }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toEqual([
        'ต้องระบุจำนวนรับอย่างน้อย 1 รายการ',
      ])
    }
  })

  // float-safe bound: 0.1 + 0.2 === 0.30000000000000004 must NOT reject an at-bound receive
  it('accepts an at-bound receive despite float imprecision (remaining 0.3, good 0.1 + damaged 0.2)', () => {
    expect(
      grnFormSchema.safeParse(
        values({ items: [line({ remaining: 0.3, good: '0.1', damaged: '0.2' })] }),
      ).success,
    ).toBe(true)
  })
})

describe('toCreatePayload — damaged-split mapper (4 cases)', () => {
  it('good-only line → 1 good item', () => {
    const out = toCreatePayload(values({ items: [line({ good: '10', damaged: '0' })] }))
    expect(out).toEqual({
      poId: 1,
      receivedDate: '2026-06-03',
      items: [{ poItemId: 11, receivedQuantity: 10, condition: 'good' }],
    })
  })

  it('damaged-only line → 1 damaged item', () => {
    const out = toCreatePayload(values({ items: [line({ good: '0', damaged: '3' })] }))
    expect(out.items).toEqual([{ poItemId: 11, receivedQuantity: 3, condition: 'damaged' }])
  })

  it('both good and damaged → 2 items (good then damaged), same poItemId', () => {
    const out = toCreatePayload(values({ items: [line({ good: '6', damaged: '4' })] }))
    expect(out.items).toEqual([
      { poItemId: 11, receivedQuantity: 6, condition: 'good' },
      { poItemId: 11, receivedQuantity: 4, condition: 'damaged' },
    ])
  })

  it('neither (both 0 / blank) → line dropped (0 items emitted)', () => {
    const out = toCreatePayload(values({ items: [line({ good: '0', damaged: '' })] }))
    expect(out.items).toEqual([])
  })

  it('emitted qty below 0.01 is NOT emitted (good = 0.009)', () => {
    const out = toCreatePayload(values({ items: [line({ good: '0.009', damaged: '0' })] }))
    expect(out.items).toEqual([])
  })

  // Regression lock (mapper side): safeNum collapses Infinity to 0, so a non-finite input is dropped
  // rather than leaking Infinity into receivedQuantity. Mirrors the schema-level lock above.
  it('drops a non-finite quantity line (good 1e999 -> safeNum 0, not emitted)', () => {
    const out = toCreatePayload(values({ items: [line({ good: '1e999', damaged: '0' })] }))
    expect(out.items).toEqual([])
  })

  it('emits exactly at the 0.01 floor (good = 0.01)', () => {
    const out = toCreatePayload(
      values({ items: [line({ good: '0.01', damaged: '0', remaining: 10 })] }),
    )
    expect(out.items).toEqual([{ poItemId: 11, receivedQuantity: 0.01, condition: 'good' }])
  })

  it('keeps trimmed notes when present, omits when blank/whitespace', () => {
    const withNotes = toCreatePayload(values({ notes: '  ของครบ  ' }))
    expect(withNotes.notes).toBe('ของครบ')
    const blank = toCreatePayload(values({ notes: '   ' }))
    expect('notes' in blank).toBe(false)
  })

  it('splits across multiple lines (per-line good/damaged), dropping empty lines', () => {
    const out = toCreatePayload(
      values({
        items: [
          line({ poItemId: 11, good: '5', damaged: '0' }),
          line({ poItemId: 12, itemName: 'ปากกา', good: '0', damaged: '0' }), // dropped
          line({ poItemId: 13, itemName: 'หมึก', good: '2', damaged: '1' }),
        ],
      }),
    )
    expect(out.items).toEqual([
      { poItemId: 11, receivedQuantity: 5, condition: 'good' },
      { poItemId: 13, receivedQuantity: 2, condition: 'good' },
      { poItemId: 13, receivedQuantity: 1, condition: 'damaged' },
    ])
  })
})

describe('createDefaultValues', () => {
  const po = {
    id: 7,
    poNumber: 'PO-2026-0007',
    prId: 1,
    vendorId: 2,
    status: 'acknowledged',
    totalAmount: '0.00',
    expectedDeliveryDate: '2026-06-01',
    actualDeliveryDate: null,
    notes: null,
    items: [
      // remaining 10 (none received) → good prefilled '10'
      {
        id: 11,
        poId: 7,
        prItemId: null,
        itemName: 'กระดาษ A4',
        quantity: '10.00',
        unit: 'รีม',
        unitPrice: '0',
        totalPrice: '0',
        receivedQuantity: '0.00',
      },
      // partially received: ordered 5, received 2 → remaining 3 → good '3'
      {
        id: 12,
        poId: 7,
        prItemId: null,
        itemName: 'ปากกา',
        quantity: '5.00',
        unit: 'ด้าม',
        unitPrice: '0',
        totalPrice: '0',
        receivedQuantity: '2.00',
      },
      // fully received: ordered 4, received 4 → remaining 0 → line DROPPED
      {
        id: 13,
        poId: 7,
        prItemId: null,
        itemName: 'หมึก',
        quantity: '4.00',
        unit: 'ขวด',
        unitPrice: '0',
        totalPrice: '0',
        receivedQuantity: '4.00',
      },
    ],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  } as unknown as PurchaseOrder

  it('seeds poId, blank receivedDate/notes', () => {
    const d = createDefaultValues(po)
    expect(d.poId).toBe(7)
    expect(d.receivedDate).toBe('')
    expect(d.notes).toBe('')
  })

  it('drops fully-received lines (remaining 0) and keeps the rest', () => {
    const d = createDefaultValues(po)
    expect(d.items).toHaveLength(2)
    expect(d.items.map((l) => l.poItemId)).toEqual([11, 12])
  })

  it('prefills good = remaining, damaged = 0, with correct ordered/alreadyReceived/remaining', () => {
    const d = createDefaultValues(po)
    expect(d.items[0]).toEqual({
      poItemId: 11,
      itemName: 'กระดาษ A4',
      ordered: 10,
      alreadyReceived: 0,
      remaining: 10,
      good: '10',
      damaged: '0',
    })
    expect(d.items[1]).toEqual({
      poItemId: 12,
      itemName: 'ปากกา',
      ordered: 5,
      alreadyReceived: 2,
      remaining: 3,
      good: '3',
      damaged: '0',
    })
  })

  it('rounds remaining to 2 decimals (float-safe)', () => {
    const floaty = {
      ...po,
      items: [
        {
          id: 21,
          poId: 7,
          prItemId: null,
          itemName: 'น้ำมัน',
          quantity: '10.10',
          unit: 'ลิตร',
          unitPrice: '0',
          totalPrice: '0',
          receivedQuantity: '0.30',
        },
      ],
    } as unknown as PurchaseOrder
    const d = createDefaultValues(floaty)
    // 10.10 - 0.30 = 9.8 (not 9.799999999999999)
    expect(d.items[0].remaining).toBe(9.8)
    expect(d.items[0].good).toBe('9.8')
  })

  it('leaves receivedDate blank so defaults are not yet submittable (user must pick a date)', () => {
    // design: createDefaultValues seeds a blank date; schema requires min(1) → defaults are intentionally invalid
    const d = createDefaultValues(po)
    expect(grnFormSchema.safeParse(d).success).toBe(false)
  })

  it('produces line items the schema accepts once a date is chosen (round-trip)', () => {
    const d = createDefaultValues(po)
    // fill the user-chosen date; this proves the generated lines (good=remaining, within bound, ≥1 emitted) pass
    expect(grnFormSchema.safeParse({ ...d, receivedDate: '2026-06-03' }).success).toBe(true)
  })
})
