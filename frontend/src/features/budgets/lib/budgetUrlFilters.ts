import type { UrlFilterConfig } from '@/shared/hooks/useUrlFilters'
import type { BudgetListFilterResult } from '../components/BudgetListFilterForm'

// frozen at module load — the "default" fiscal year (omitted from the URL = canonical)
const CURRENT_YEAR = new Date().getFullYear()

export const DEFAULT_BUDGET_FILTERS: BudgetListFilterResult = {
  fiscalYear: CURRENT_YEAR,
}

export function parseBudgetFilters(params: URLSearchParams): BudgetListFilterResult {
  const rawYear = params.get('fiscalYear')
  const year = rawYear && /^\d+$/.test(rawYear) ? Number(rawYear) : CURRENT_YEAR
  // defensive: same range the form enforces (2020-2100) → else fall back to current year
  const fiscalYear = year >= 2020 && year <= 2100 ? year : CURRENT_YEAR
  const rawDept = params.get('departmentId')
  // defensive = SYNTACTIC only (digits); membership in the department list is not checked
  const departmentId = rawDept && /^\d+$/.test(rawDept) ? Number(rawDept) : undefined
  return { fiscalYear, departmentId }
}

export function serializeBudgetFilters(
  v: BudgetListFilterResult,
  params: URLSearchParams,
): void {
  // canonical: omit the current-year default; write any other year
  if (v.fiscalYear && v.fiscalYear !== CURRENT_YEAR) params.set('fiscalYear', String(v.fiscalYear))
  else params.delete('fiscalYear')
  if (v.departmentId != null) params.set('departmentId', String(v.departmentId))
  else params.delete('departmentId')
}

export const budgetUrlFilterConfig: UrlFilterConfig<BudgetListFilterResult> = {
  defaults: DEFAULT_BUDGET_FILTERS,
  parse: parseBudgetFilters,
  serialize: serializeBudgetFilters,
  resetPage: false, // Budgets has no usePagination (client-side sort) → no page param in the URL
}
