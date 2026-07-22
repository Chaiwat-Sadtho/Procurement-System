import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { goodsReceiptsApi } from '../api'

// POs that already have a GRN, for the GRN-list history filter. Distinct from useReceivablePOs, the
// create picker, which also needs acknowledged POs but must exclude completed ones.
export function useReceivedPOs({ enabled = true }: QueryEnabledOptions = {}) {
  return useQuery({
    // Keyed under 'purchase-orders' so PO/GRN mutations refresh this dropdown too
    queryKey: ['purchase-orders', 'with-receipts'],
    queryFn: () => goodsReceiptsApi.listPOsWithReceipts(),
    enabled,
  })
}
