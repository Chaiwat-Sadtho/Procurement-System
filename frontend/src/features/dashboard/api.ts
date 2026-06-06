import api from '@/shared/lib/axios'
import { safeNum } from '@/shared/lib/safeNum'
import type {
  PrStatsResponse,
  PRListResponse,
  PurchaseRequest,
} from '@/features/purchase-requests/types'

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

export interface DashboardDepartment {
  id: number
  name: string
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

  // draft + rejected ของ user (role-scoped employee = ของตัวเอง) สำหรับ AttentionList list รายตัว
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
      // pg numeric กลับมาเป็น string → coerce ที่ boundary ให้ type number เป็นจริง
      // safeNum กัน non-finite (NaN/Infinity) ไม่ให้หลุดไปคำนวณ (reservedAmount+usedAmount) หรือแสดงผล (฿NaN/฿∞)
      r.data.map((b) => ({
        ...b,
        totalAmount: safeNum(b.totalAmount),
        reservedAmount: safeNum(b.reservedAmount),
        usedAmount: safeNum(b.usedAmount),
      })),
    ),

  getDepartments: (): Promise<DashboardDepartment[]> =>
    api.get<DashboardDepartment[]>('/departments').then((r) => r.data),
}
