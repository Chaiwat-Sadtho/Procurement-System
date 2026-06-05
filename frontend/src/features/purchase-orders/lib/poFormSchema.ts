import { z } from 'zod'
import type { CreatePORequest, PurchaseOrder, UpdatePORequest } from '../types'

export { safeNum } from '@/shared/lib/safeNum'

const itemSchema = z.object({
  prItemId: z.number().optional(),
  itemName: z.string().trim().min(1, 'กรุณาระบุชื่อรายการ').max(255, 'ไม่เกิน 255 ตัวอักษร'),
  quantity: z
    .string()
    .min(1, 'กรุณาระบุจำนวน')
    // Number.isFinite also rejects NaN and Infinity ('1e999'), so the latter cannot leak into the
    // mapped payload (Number(Infinity) -> JSON null -> backend 400).
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0.01, 'จำนวนต้องมากกว่าหรือเท่ากับ 0.01'),
  unit: z.string().trim().min(1, 'กรุณาระบุหน่วย').max(50, 'ไม่เกิน 50 ตัวอักษร'),
  unitPrice: z
    .string()
    .min(1, 'กรุณาระบุราคาต่อหน่วย')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, 'ราคาต้องเป็นตัวเลขไม่ติดลบ'),
})

export const poFormSchema = z.object({
  prId: z.number().refine((v) => v > 0, 'กรุณาเลือกใบขอซื้อ (PR)'),
  vendorId: z.number().refine((v) => v > 0, 'กรุณาเลือกผู้ขาย'),
  expectedDeliveryDate: z.string().min(1, 'กรุณาเลือกวันที่กำหนดส่ง'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
})

export type POFormValues = z.infer<typeof poFormSchema>

function mapItems(values: POFormValues): CreatePORequest['items'] {
  return values.items.map((it) => ({
    ...(it.prItemId != null ? { prItemId: it.prItemId } : {}),
    itemName: it.itemName.trim(),
    quantity: Number(it.quantity),
    unit: it.unit.trim(),
    unitPrice: Number(it.unitPrice),
  }))
}

export function toCreatePayload(values: POFormValues): CreatePORequest {
  const notes = values.notes?.trim()
  return {
    prId: values.prId,
    vendorId: values.vendorId,
    expectedDeliveryDate: values.expectedDeliveryDate,
    ...(notes ? { notes } : {}),
    items: mapItems(values),
  }
}

export function toUpdatePayload(values: POFormValues): UpdatePORequest {
  const notes = values.notes?.trim()
  return {
    expectedDeliveryDate: values.expectedDeliveryDate,
    ...(notes ? { notes } : {}),
    items: mapItems(values),
  }
}

export function poToFormValues(po: PurchaseOrder): POFormValues {
  return {
    prId: po.prId,
    vendorId: po.vendorId,
    expectedDeliveryDate: po.expectedDeliveryDate,
    notes: po.notes ?? '',
    items: po.items.map((it) => ({
      ...(it.prItemId != null ? { prItemId: it.prItemId } : {}),
      itemName: it.itemName,
      quantity: String(Number(it.quantity)),
      unit: it.unit,
      unitPrice: String(Number(it.unitPrice)),
    })),
  }
}

export function emptyItem(): POFormValues['items'][number] {
  return { itemName: '', quantity: '1', unit: '', unitPrice: '0' }
}

export function createDefaultValues(): POFormValues {
  return {
    prId: 0,
    vendorId: 0,
    expectedDeliveryDate: '',
    notes: '',
    items: [emptyItem()],
  }
}
