import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { budgetsApi } from '../api'
import type { BudgetListParams } from '../types'

// Search-first: params are always a real object; { enabled } decides when the query fires
export function useBudgets(
  params: BudgetListParams,
  { enabled = true }: QueryEnabledOptions = {},
) {
  return useQuery({
    queryKey: ['budgets', params],
    queryFn: () => budgetsApi.list(params),
    enabled,
  })
}
