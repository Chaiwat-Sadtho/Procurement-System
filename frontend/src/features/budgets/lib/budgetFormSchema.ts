import { z } from 'zod'
import type { BudgetSummary, CreateBudgetRequest, UpdateBudgetRequest } from '../types'

export const QUARTER_ANNUAL = 'annual'

const amountField = z
  .string()
  .min(1, 'กรุณาระบุงบประมาณ')
  // Number.isFinite also rejects NaN and Infinity, which would serialise to null and 400 the request
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 1, 'งบประมาณต้องมากกว่าหรือเท่ากับ 1')

// Mirrors CreateBudgetDto
export const createBudgetSchema = z.object({
  departmentId: z.number().refine((v) => v > 0, 'กรุณาเลือกแผนก'),
  fiscalYear: z
    .number()
    .int('ปีงบต้องเป็นจำนวนเต็ม')
    .min(2020, 'ปีงบต้องไม่ต่ำกว่า 2020')
    .max(2100, 'ปีงบต้องไม่เกิน 2100'),
  quarter: z.string(), // 'annual' | '1'..'4'
  totalAmount: amountField,
})

export type BudgetFormValues = z.infer<typeof createBudgetSchema>

// Editing adds one rule: the total can never drop below what is already committed
export function makeEditBudgetSchema(committed: number) {
  return createBudgetSchema.extend({
    totalAmount: amountField.refine(
      (v) => Number(v) >= committed,
      `ต้องไม่ต่ำกว่ายอดที่ผูกพันแล้ว (${committed.toLocaleString('th-TH')})`,
    ),
  })
}

function quarterToNumber(q: string): number | null {
  return q === QUARTER_ANNUAL ? null : Number(q)
}

export function toCreatePayload(values: BudgetFormValues): CreateBudgetRequest {
  return {
    departmentId: values.departmentId,
    fiscalYear: values.fiscalYear,
    quarter: quarterToNumber(values.quarter),
    totalAmount: Number(values.totalAmount),
  }
}

export function toUpdatePayload(values: BudgetFormValues): UpdateBudgetRequest {
  return { totalAmount: Number(values.totalAmount) }
}

export function createDefaultValues(): BudgetFormValues {
  return {
    departmentId: 0,
    fiscalYear: new Date().getFullYear(),
    quarter: QUARTER_ANNUAL,
    totalAmount: '',
  }
}

export function budgetToFormValues(b: BudgetSummary): BudgetFormValues {
  return {
    departmentId: b.departmentId,
    fiscalYear: b.fiscalYear,
    quarter: b.quarter == null ? QUARTER_ANNUAL : String(b.quarter),
    totalAmount: String(b.totalAmount),
  }
}
