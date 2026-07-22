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
    // Stricter than the backend: good + damaged must fit in what is left. Round first so float
    // imprecision does not reject an exactly-at-the-bound receive.
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
    // The 0.01 threshold matches the mapper's floor, so a valid form never maps to an empty items[]
    const emitted = values.items.some((l) => safeNum(l.good) >= 0.01 || safeNum(l.damaged) >= 0.01)
    if (!emitted)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'ต้องระบุจำนวนรับอย่างน้อย 1 รายการ',
      })
  })

export type GrnFormValues = z.infer<typeof grnFormSchema>

// One form line can emit two DTO items — a good one and a damaged one; empty quantities are dropped
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

// Seed the form from a PO: good defaults to what is outstanding, fully-received lines are dropped
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
        // the filter below guarantees remaining > 0
        good: String(remaining),
        damaged: '0',
      }
    })
    .filter((line) => line.remaining > 0)
  return { poId: po.id, receivedDate: '', notes: '', items }
}
