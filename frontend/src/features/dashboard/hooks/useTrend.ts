import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useTrend() {
  return useQuery({ queryKey: ['dashboard', 'trend'], queryFn: dashboardApi.getTrend })
}
