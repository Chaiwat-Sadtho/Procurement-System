import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: dashboardApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  })
}
