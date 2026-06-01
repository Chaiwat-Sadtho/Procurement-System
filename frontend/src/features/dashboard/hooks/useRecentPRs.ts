import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useRecentPRs() {
  return useQuery({ queryKey: ['dashboard', 'recent'], queryFn: dashboardApi.getRecentPRs })
}
