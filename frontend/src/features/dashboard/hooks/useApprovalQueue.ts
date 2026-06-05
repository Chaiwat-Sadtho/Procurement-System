import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useApprovalQueue() {
  return useQuery({ queryKey: ['dashboard', 'queue'], queryFn: dashboardApi.getApprovalQueue })
}
