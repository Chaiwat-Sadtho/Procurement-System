import { useQuery } from '@tanstack/react-query'
import type { PaginationParams, QueryEnabledOptions } from '@/shared/types'
import { vendorsApi } from '../api'

interface UseVendorsParams extends PaginationParams {
  search?: string
  isBlacklisted?: boolean
  categoryId?: number
}

export function useVendors(
  params?: UseVendorsParams,
  { enabled = true }: QueryEnabledOptions = {},
) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: () => vendorsApi.list(params),
    enabled,
  })
}
