import { z } from 'zod'
import type { CreateGoodsReceiptPayload } from '../types'
import type { PurchaseOrder } from '@/features/purchase-orders/types'
import { safeNum } from '@/shared/lib/safeNum'

export { safeNum }

const lineSchema = z
  .object({
    poItemId: z.number(),
    itemName: z.string(),
    ordered: z.number(), // poItem.quantity
    alreadyReceived: z.number(), // poItem.receivedQuantity (cumulative)
    remaining: z.number(), // ordered - alreadyReceived (carried for bound)
    good: z.string(), // string input, may be ''
    damaged: z.string(), // string input, may be ''
  })
  .superRefine((line, ctx) => {
    const good = safeNum(line.good)
    const damaged = safeNum(line.damaged)
    if (good < 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['good'], message: 'ต้องไม่ติดลบ' })
    if (damaged < 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['damaged'], message: 'ต้องไม่ติดลบ' })
    // FE-bound stricter than backend (spec §7): good + damaged ≤ remaining.
    // Round the sum to 2dp first so float imprecision (0.1+0.2=0.30000000000000004) does not falsely reject an at-bound receive.
    if (Number((good + damaged).toFixed(2)) > line.remaining)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['good'],
        message: `รวมต้องไม่เกินคงเหลือ (${line.remaining})`,
      })
  })

export const grnFormSchema = z
  .object({
    poId: z.number().refine((v) => v > 0, 'กรุณาเลือกใบสั่งซื้อ (PO)'),
    receivedDate: z.string().min(1, 'กรุณาเลือกวันที่รับ'),
    notes: z.string().optional(),
    items: z.array(lineSchema),
  })
  .superRefine((values, ctx) => {
    // ≥1 emitted DTO item (ArrayMinSize 1) — threshold mirrors the mapper's 0.01 floor (spec §7 +
    // backend @Min(0.01)) so a schema-valid form never maps to an empty items[] the backend would 400.
    const emitted = values.items.some(
      (l) => safeNum(l.good) >= 0.01 || safeNum(l.damaged) >= 0.01,
    )
    if (!emitted)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'ต้องระบุจำนวนรับอย่างน้อย 1 รายการ',
      })
  })

export type GrnFormValues = z.infer<typeof grnFormSchema>

// damaged-split mapper (spec §7, test 4 cases): per line emit good item if good>0
// AND damaged item if damaged>0; drop empty; each emitted qty ≥ 0.01.
export function toCreatePayload(values: GrnFormValues): CreateGoodsReceiptPayload {
  const notes = values.notes?.trim()
  const items: CreateGoodsReceiptPayload['items'] = []
  for (const line of values.items) {
    const good = safeNum(line.good)
    const damaged = safeNum(line.damaged)
    if (good >= 0.01)
      items.push({ poItemId: line.poItemId, receivedQuantity: good, condition: 'good' })
    if (damaged >= 0.01)
      items.push({ poItemId: line.poItemId, receivedQuantity: damaged, condition: 'damaged' })
  }
  return {
    poId: values.poId,
    receivedDate: values.receivedDate,
    ...(notes ? { notes } : {}),
    items,
  }
}

// build form lines from a loaded PO: good defaults to remaining, damaged '0';
// only lines with remaining > 0 (fully-received lines dropped).
export function createDefaultValues(po: PurchaseOrder): GrnFormValues {
  const items = po.items
    .map((it) => {
      const ordered = Number(it.quantity)
      const alreadyReceived = Number(it.receivedQuantity)
      const remaining = Number((ordered - alreadyReceived).toFixed(2))
      return {
        poItemId: it.id,
        itemName: it.itemName,
        ordered,
        alreadyReceived,
        remaining,
        // remaining > 0 guaranteed by the filter below, so no need for a 0-branch here
        good: String(remaining),
        damaged: '0',
      }
    })
    .filter((line) => line.remaining > 0)
  return { poId: po.id, receivedDate: '', notes: '', items }
}
