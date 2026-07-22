import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { goodsReceiptsApi } from '../api'

// POs that can still receive goods, for the GRN create picker; the server resolves the filter
export function useReceivablePOs({ enabled = true }: QueryEnabledOptions = {}) {
  return useQuery({
    // Keyed under 'purchase-orders' so PO/GRN mutations refresh this picker — a completed PO must
    // drop out of it. Re-namespacing this key would break that.
    queryKey: ['purchase-orders', 'receivable'],
    queryFn: () => goodsReceiptsApi.listReceivablePOs(),
    enabled,
  })
}
