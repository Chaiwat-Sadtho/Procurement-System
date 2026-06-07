import { useQuery } from '@tanstack/react-query'
import { budgetsApi } from '../api'
import type { BudgetListParams } from '../types'

// search-first: params = null ก่อนกดค้นหา → query ไม่ยิง (enabled=false)
export function useBudgets(params: BudgetListParams | null) {
  return useQuery({
    queryKey: ['budgets', params],
    queryFn: () => budgetsApi.list(params as BudgetListParams),
    enabled: params !== null,
  })
}
