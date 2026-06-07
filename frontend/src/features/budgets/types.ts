import type { PoStatus } from '@/features/purchase-orders/types'

export interface BudgetDeptRef {
  id: number
  name: string
}

// GET /budgets (array, ไม่ paginate) — money coerce เป็น number ที่ api boundary
export interface Budget {
  id: number
  departmentId: number
  department: BudgetDeptRef | null
  fiscalYear: number
  quarter: number | null
  totalAmount: number
  reservedAmount: number
  usedAmount: number
  createdAt: string
  updatedAt: string
}

// GET /budgets/:id/summary = Budget + remaining/usagePercent
export interface BudgetSummary extends Budget {
  remaining: number
  usagePercent: number
}

export type BudgetBucket = 'reserved' | 'used'

// GET /budgets/:id/transactions
export interface BudgetTransaction {
  prId: number
  prNumber: string
  prTitle: string
  requesterName: string
  approvedAt: string | null
  poId: number | null
  poNumber: string | null
  poStatus: PoStatus | null
  amount: number
  bucket: BudgetBucket
}

export interface BudgetListParams {
  departmentId?: number
  fiscalYear: number
}

// POST /budgets (CreateBudgetDto)
export interface CreateBudgetRequest {
  departmentId: number
  fiscalYear: number
  quarter: number | null
  totalAmount: number
}

// PATCH /budgets/:id (UpdateBudgetDto)
export interface UpdateBudgetRequest {
  totalAmount: number
}
