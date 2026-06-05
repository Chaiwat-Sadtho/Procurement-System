import { z } from 'zod'
import type { CreatePRRequest, PurchaseRequest, UpdatePRRequest } from '../types'

export function safeNum(v: string | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const itemSchema = z.object({
  itemName: z.string().trim().min(1, 'กรุณาระบุชื่อรายการ').max(255, 'ไม่เกิน 255 ตัวอักษร'),
  description: z.string().optional(),
  quantity: z
    .string()
    .min(1, 'กรุณาระบุจำนวน')
    // Number.isFinite also rejects NaN and Infinity ('1e999'), so the latter cannot leak into the
    // mapped payload (Number(Infinity) -> JSON null -> backend 400).
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0.01, 'จำนวนต้องมากกว่า 0'),
  unit: z.string().trim().min(1, 'กรุณาระบุหน่วย').max(50, 'ไม่เกิน 50 ตัวอักษร'),
  estimatedUnitPrice: z
    .string()
    .min(1, 'กรุณาระบุราคาต่อหน่วย')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, 'ราคาต้องเป็นตัวเลขไม่ติดลบ'),
})

export const prFormSchema = z.object({
  title: z.string().trim().min(1, 'กรุณาระบุชื่อเรื่อง').max(255, 'ไม่เกิน 255 ตัวอักษร'),
  requiredDate: z.string().min(1, 'กรุณาเลือกวันที่ต้องการ'),
  period: z.enum(['annual', '1', '2', '3', '4']),
  items: z.array(itemSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
})

export type PRFormValues = z.infer<typeof prFormSchema>

function mapItems(values: PRFormValues): CreatePRRequest['items'] {
  return values.items.map((it) => {
    const description = it.description?.trim()
    return {
      itemName: it.itemName.trim(),
      ...(description ? { description } : {}),
      quantity: Number(it.quantity),
      unit: it.unit.trim(),
      estimatedUnitPrice: Number(it.estimatedUnitPrice),
    }
  })
}

export function toCreatePayload(values: PRFormValues): CreatePRRequest {
  return {
    title: values.title.trim(),
    requiredDate: values.requiredDate,
    quarter: values.period === 'annual' ? null : Number(values.period),
    items: mapItems(values),
  }
}

export function toUpdatePayload(values: PRFormValues): UpdatePRRequest {
  return {
    title: values.title.trim(),
    requiredDate: values.requiredDate,
    items: mapItems(values),
  }
}

export function prToFormValues(pr: PurchaseRequest): PRFormValues {
  return {
    title: pr.title,
    requiredDate: pr.requiredDate,
    period: pr.quarter == null ? 'annual' : (String(pr.quarter) as PRFormValues['period']),
    items: pr.items.map((it) => ({
      itemName: it.itemName,
      description: it.description ?? '',
      quantity: String(Number(it.quantity)),
      unit: it.unit,
      estimatedUnitPrice: String(Number(it.estimatedUnitPrice)),
    })),
  }
}

export function emptyItem(): PRFormValues['items'][number] {
  return { itemName: '', description: '', quantity: '1', unit: '', estimatedUnitPrice: '0' }
}

export function createDefaultValues(): PRFormValues {
  return { title: '', requiredDate: '', period: 'annual', items: [emptyItem()] }
}
