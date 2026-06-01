import api from '@/shared/lib/axios'
import type { PrStatsResponse, PRListResponse, PurchaseRequest } from '@/features/purchase-requests/types'

// Budget shape จาก GET /budgets (array, ไม่ paginate) — ไม่มี remaining/usagePercent (เฉพาะ /:id/summary)
export interface DashboardBudget {
  id: number
  departmentId: number
  department: { id: number; name: string } | null
  fiscalYear: number
  quarter: number | null
  totalAmount: number
  reservedAmount: number
  usedAmount: number
}

interface BudgetParams {
  departmentId?: number
  fiscalYear: number
}

export const dashboardApi = {
  getStats: (): Promise<PrStatsResponse> =>
    api.get<PrStatsResponse>('/purchase-requests/stats').then((r) => r.data),

  getRecentPRs: (): Promise<PurchaseRequest[]> =>
    api
      .get<PRListResponse>('/purchase-requests', { params: { limit: 5, sort: 'created_at', order: 'DESC' } })
      .then((r) => r.data.data),

  getApprovalQueue: (): Promise<PurchaseRequest[]> =>
    api
      .get<PRListResponse>('/purchase-requests', { params: { status: 'submitted', limit: 5 } })
      .then((r) => r.data.data),

  getBudgets: (params: BudgetParams): Promise<DashboardBudget[]> =>
    api.get<DashboardBudget[]>('/budgets', { params }).then((r) => r.data),
}
