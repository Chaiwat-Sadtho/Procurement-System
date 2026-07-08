import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ReceivablePO } from '@/features/goods-receipts/types'

vi.mock('@/features/goods-receipts/api', () => ({
  goodsReceiptsApi: { listPOsWithReceipts: vi.fn() },
}))

import { goodsReceiptsApi } from '@/features/goods-receipts/api'
import { useReceivedPOs } from '@/features/goods-receipts/hooks/useReceivedPOs'

// api.ts maps {data,meta} -> ReceivablePO[]; the hook returns that array. History-filter
// set = partially_received + completed (POs that actually have a GRN).
const fake: ReceivablePO[] = [
  { id: 3, poNumber: 'PO-2025-0003', status: 'partially_received' },
  { id: 4, poNumber: 'PO-2025-0004', status: 'completed' },
]

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function makeWrapper(qc: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useReceivedPOs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches POs with receipts and caches them at the purchase-orders with-receipts key', async () => {
    vi.mocked(goodsReceiptsApi.listPOsWithReceipts).mockResolvedValue(fake)
    const qc = makeQc()
    const { result } = renderHook(() => useReceivedPOs(), {
      wrapper: makeWrapper(qc),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(goodsReceiptsApi.listPOsWithReceipts).toHaveBeenCalledWith()
    expect(result.current.data).toEqual(fake)
    // pin the queryKey: PO/GRN mutations invalidate the ['purchase-orders'] prefix so a PO
    // that just gained a GRN appears in this dropdown; that cross-hook contract regresses
    // silently if this key is renamed, so lock it here (mirror useReceivablePOs).
    expect(qc.getQueryData(['purchase-orders', 'with-receipts'])).toEqual(fake)
  })

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => useReceivedPOs({ enabled: false }), {
      wrapper: makeWrapper(makeQc()),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(goodsReceiptsApi.listPOsWithReceipts).not.toHaveBeenCalled()
  })
})
