import { useQuery } from '@tanstack/react-query'
import { budgetsApi } from '../api'

export function useBudgetTransactions(id: number) {
  return useQuery({
    queryKey: ['budget', id, 'transactions'],
    queryFn: () => budgetsApi.transactions(id),
    enabled: id > 0,
  })
}
