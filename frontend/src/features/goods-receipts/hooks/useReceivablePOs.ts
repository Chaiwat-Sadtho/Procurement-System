import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { goodsReceiptsApi } from '../api'

// Pre-filtered PO list for the GRN create picker (acknowledged + partially_received).
// The `receivable` flag is resolved server-side (slice A); api.ts unwraps {data,meta}
// to a bare ReceivablePO[] so the Combobox gets a flat array.
export function useReceivablePOs({ enabled = true }: QueryEnabledOptions = {}) {
  return useQuery({
    // Deliberately under the ['purchase-orders'] prefix (NOT 'goods-receipts') so the
    // PO/GRN mutations that invalidate ['purchase-orders'] also refresh this picker —
    // a completed PO must drop out of ?receivable=true. Do not re-namespace this key
    // under 'goods-receipts' or that cross-hook freshness contract breaks.
    queryKey: ['purchase-orders', 'receivable'],
    queryFn: () => goodsReceiptsApi.listReceivablePOs(),
    enabled,
  })
}
