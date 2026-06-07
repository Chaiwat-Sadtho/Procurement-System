import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { budgetsApi } from '../api'
import type { BudgetListParams } from '../types'

// search-first: params เป็น object จริงเสมอ; การยิง query ควบคุมด้วย { enabled } (มิเรอร์ group A)
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
