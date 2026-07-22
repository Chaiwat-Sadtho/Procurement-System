import api from '@/shared/lib/axios'
import { safeNum } from '@/shared/lib/safeNum'
import type {
  Budget,
  BudgetSummary,
  BudgetTransaction,
  BudgetListParams,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from './types'

// pg numeric arrives as a string — coerce here so the declared number type holds (safeNum blocks NaN)
function coerceMoney<T extends { totalAmount: number; reservedAmount: number; usedAmount: number }>(
  b: T,
): T {
  return {
    ...b,
    totalAmount: safeNum(b.totalAmount),
    reservedAmount: safeNum(b.reservedAmount),
    usedAmount: safeNum(b.usedAmount),
  }
}

export const budgetsApi = {
  list: (params: BudgetListParams) =>
    api.get<Budget[]>('/budgets', { params }).then((r) => r.data.map(coerceMoney)),

  summary: (id: number) =>
    api.get<BudgetSummary>(`/budgets/${id}/summary`).then((r) => ({
      ...coerceMoney(r.data),
      remaining: safeNum(r.data.remaining),
      usagePercent: safeNum(r.data.usagePercent),
    })),

  transactions: (id: number) =>
    api
      .get<BudgetTransaction[]>(`/budgets/${id}/transactions`)
      .then((r) => r.data.map((t) => ({ ...t, amount: safeNum(t.amount) }))),

  create: (data: CreateBudgetRequest) =>
    api.post<Budget>('/budgets', data).then((r) => r.data),

  update: (id: number, data: UpdateBudgetRequest) =>
    api.patch<Budget>(`/budgets/${id}`, data).then((r) => r.data),
}
