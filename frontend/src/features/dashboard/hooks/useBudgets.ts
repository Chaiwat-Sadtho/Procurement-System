import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useBudgets(params: { departmentId?: number; fiscalYear: number }) {
  return useQuery({
    queryKey: ['dashboard', 'budgets', params.departmentId ?? 'all', params.fiscalYear],
    queryFn: () => dashboardApi.getBudgets(params),
  })
}
