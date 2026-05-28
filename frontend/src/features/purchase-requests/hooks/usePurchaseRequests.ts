import { useQuery } from '@tanstack/react-query'
import { purchaseRequestsApi } from '../api'

interface UsePurchaseRequestsParams {
  page?: number
  limit?: number
  status?: string
}

export function usePurchaseRequests(params?: UsePurchaseRequestsParams) {
  return useQuery({
    queryKey: ['purchase-requests', params],
    queryFn: () => purchaseRequestsApi.list(params),
  })
}
