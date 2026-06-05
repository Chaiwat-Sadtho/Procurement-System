import { useQuery } from '@tanstack/react-query'
import type { PaginationParams, QueryEnabledOptions } from '@/shared/types'
import { purchaseRequestsApi } from '../api'

interface UsePurchaseRequestsParams extends PaginationParams {
  status?: string
  prNumber?: string
  search?: string
  requesterName?: string
  from?: string
  to?: string
}

export function usePurchaseRequests(
  params?: UsePurchaseRequestsParams,
  { enabled = true }: QueryEnabledOptions = {},
) {
  return useQuery({
    queryKey: ['purchase-requests', params],
    queryFn: () => purchaseRequestsApi.list(params),
    enabled,
  })
}
