import { useQuery } from '@tanstack/react-query'
import { dashboardApi, type DashboardBudget } from '@/features/dashboard/api'

// Minimal PR shape the budget preview needs, typed structurally. fiscalYear is optional because the FE
// PurchaseRequest type does not carry it; the hook then defaults to the current year, like the backend.
export interface BudgetForPRPr {
  departmentId: number | null
  quarter: number | null
  fiscalYear?: number | null
}

// Exact quarter match, mirroring the backend's budgetWhere — there is no quarterly → annual fallback
export function matchBudgetForPR(
  budgets: DashboardBudget[],
  pr: Pick<BudgetForPRPr, 'quarter'>,
): DashboardBudget | undefined {
  return budgets.find((b) => b.quarter === pr.quarter)
}

export function useBudgetForPR(pr: BudgetForPRPr | null) {
  const departmentId = pr?.departmentId ?? null
  // Default to the current year so the preview asks for the row the backend gate will touch
  const fiscalYear = pr?.fiscalYear ?? new Date().getFullYear()
  const enabled = departmentId != null

  return useQuery({
    queryKey: ['budgets', { departmentId, fiscalYear }],
    queryFn: () => dashboardApi.getBudgets({ departmentId: departmentId!, fiscalYear }),
    enabled,
  })
}
