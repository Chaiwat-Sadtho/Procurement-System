import { useQuery } from '@tanstack/react-query'
import { purchaseRequestsApi } from '../api'

interface UsePurchaseRequestsParams {
  page?: number
  limit?: number
  status?: string
  prNumber?: string
  search?: string
  requesterId?: number
  from?: string
  to?: string
}

interface UsePurchaseRequestsOptions {
  enabled?: boolean
}

export function usePurchaseRequests(
  params?: UsePurchaseRequestsParams,
  { enabled = true }: UsePurchaseRequestsOptions = {},
) {
  return useQuery({
    queryKey: ['purchase-requests', params],
    queryFn: () => purchaseRequestsApi.list(params),
    enabled,
  })
}
