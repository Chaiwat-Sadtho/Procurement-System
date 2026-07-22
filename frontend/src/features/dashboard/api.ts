import api from '@/shared/lib/axios'
import { safeNum } from '@/shared/lib/safeNum'
import type {
  PrStatsResponse,
  PRListResponse,
  PurchaseRequest,
} from '@/features/purchase-requests/types'

// Budget shape from GET /budgets — remaining/usagePercent only come from /:id/summary
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

export interface DashboardDepartment {
  id: number
  name: string
}

export interface TrendPoint {
  month: string // 'YYYY-MM'
  count: number
}

export interface SpendByDept {
  departmentId: number
  departmentName: string
  total: number
}

export const dashboardApi = {
  getStats: (): Promise<PrStatsResponse> =>
    api.get<PrStatsResponse>('/purchase-requests/stats').then((r) => r.data),

  getRecentPRs: (): Promise<PurchaseRequest[]> =>
    api
      .get<PRListResponse>('/purchase-requests', {
        params: { limit: 5, sort: 'created_at', order: 'DESC' },
      })
      .then((r) => r.data.data),

  getApprovalQueue: (): Promise<PurchaseRequest[]> =>
    api
      .get<PRListResponse>('/purchase-requests', { params: { status: 'submitted', limit: 5 } })
      .then((r) => r.data.data),

  // The user's own drafts and rejections, for the attention list
  getAttentionPRs: (): Promise<{ drafts: PurchaseRequest[]; rejected: PurchaseRequest[] }> =>
    Promise.all([
      api
        .get<PRListResponse>('/purchase-requests', {
          params: { status: 'draft', limit: 5, sort: 'created_at', order: 'DESC' },
        })
        .then((r) => r.data.data),
      api
        .get<PRListResponse>('/purchase-requests', {
          params: { status: 'rejected', limit: 5, sort: 'created_at', order: 'DESC' },
        })
        .then((r) => r.data.data),
    ]).then(([drafts, rejected]) => ({ drafts, rejected })),

  getBudgets: (params: BudgetParams): Promise<DashboardBudget[]> =>
    api.get<DashboardBudget[]>('/budgets', { params }).then((r) =>
      // pg numeric arrives as a string — coerce here so the declared number type holds, and
      // safeNum keeps NaN/Infinity out of the totals and the formatted amounts
      r.data.map((b) => ({
        ...b,
        totalAmount: safeNum(b.totalAmount),
        reservedAmount: safeNum(b.reservedAmount),
        usedAmount: safeNum(b.usedAmount),
      })),
    ),

  getDepartments: (): Promise<DashboardDepartment[]> =>
    api.get<DashboardDepartment[]>('/departments').then((r) => r.data),

  getTrend: (): Promise<TrendPoint[]> =>
    api.get<TrendPoint[]>('/purchase-requests/trend').then((r) => r.data),

  getSpendByDepartment: (): Promise<SpendByDept[]> =>
    api
      .get<SpendByDept[]>('/purchase-requests/spend-by-department')
      .then((r) => r.data.map((s) => ({ ...s, total: safeNum(s.total) }))),
}
