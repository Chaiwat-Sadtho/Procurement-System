import { useQuery } from '@tanstack/react-query'
import { dashboardApi, type DashboardBudget } from '@/features/dashboard/api'

// Minimal PR shape the budget preview needs. departmentId + quarter come from
// the eligible PR; fiscalYear is OPTIONAL because the real PurchaseRequest type
// does not surface it -> the hook defaults to the current year (mirrors the
// backend `pr.fiscalYear ?? currentYear`). Typed structurally so this hook does
// not hard-depend on the full PurchaseRequest type.
export interface BudgetForPRPr {
  departmentId: number | null
  quarter: number | null
  fiscalYear?: number | null
}

// Exact quarter match — mirrors backend budgetWhere (§4A): a quarterly PR uses
// the row with the same quarter; an annual PR (quarter null) uses the row with
// quarter null. There is NO quarterly -> annual fallback.
export function matchBudgetForPR(
  budgets: DashboardBudget[],
  pr: Pick<BudgetForPRPr, 'quarter'>,
): DashboardBudget | undefined {
  return budgets.find((b) => b.quarter === pr.quarter)
}

export function useBudgetForPR(pr: BudgetForPRPr | null) {
  const departmentId = pr?.departmentId ?? null
  // PR.fiscalYear is not part of the FE PurchaseRequest contract; default to the
  // current year so the preview asks for the same row the backend gate touches.
  const fiscalYear = pr?.fiscalYear ?? new Date().getFullYear()
  const enabled = departmentId != null

  return useQuery({
    queryKey: ['budgets', { departmentId, fiscalYear }],
    queryFn: () => dashboardApi.getBudgets({ departmentId: departmentId!, fiscalYear }),
    enabled,
  })
}
