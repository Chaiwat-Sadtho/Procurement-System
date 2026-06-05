import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { purchaseOrdersApi } from '../api'
import type { POListParams } from '../types'

export function usePurchaseOrders(
  params?: POListParams,
  { enabled = true }: QueryEnabledOptions = {},
) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => purchaseOrdersApi.list(params),
    enabled,
  })
}
