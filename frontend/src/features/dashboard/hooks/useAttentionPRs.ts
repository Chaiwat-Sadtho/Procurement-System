import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useAttentionPRs() {
  return useQuery({ queryKey: ['dashboard', 'attention'], queryFn: dashboardApi.getAttentionPRs })
}
