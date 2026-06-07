import { useQuery } from '@tanstack/react-query'
import { budgetsApi } from '../api'

export function useBudgetSummary(id: number) {
  return useQuery({
    queryKey: ['budget', id, 'summary'],
    queryFn: () => budgetsApi.summary(id),
    enabled: id > 0,
  })
}
