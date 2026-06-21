import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useSpendByDept(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'spend-by-dept'],
    queryFn: dashboardApi.getSpendByDepartment,
    enabled,
  })
}
