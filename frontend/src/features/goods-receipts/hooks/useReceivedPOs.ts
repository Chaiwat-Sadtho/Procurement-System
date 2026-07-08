import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { goodsReceiptsApi } from '../api'

// PO list for the GRN-list history filter (partially_received + completed — POs that
// actually have a GRN). Distinct from useReceivablePOs (the create picker, which needs
// acknowledged too, but must exclude completed). The `withReceipts` flag is resolved
// server-side (mirror of `receivable`); api.ts unwraps {data,meta} to a bare array.
export function useReceivedPOs({ enabled = true }: QueryEnabledOptions = {}) {
  return useQuery({
    // Under the ['purchase-orders'] prefix (NOT 'goods-receipts') so PO/GRN mutations that
    // invalidate ['purchase-orders'] also refresh this dropdown — a PO that just reached
    // partially_received/completed must appear here. Keep the key under this prefix.
    queryKey: ['purchase-orders', 'with-receipts'],
    queryFn: () => goodsReceiptsApi.listPOsWithReceipts(),
    enabled,
  })
}
