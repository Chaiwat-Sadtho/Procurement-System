import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ReceivablePO } from '@/features/goods-receipts/types'

vi.mock('@/features/goods-receipts/api', () => ({
  goodsReceiptsApi: { listReceivablePOs: vi.fn() },
}))

import { goodsReceiptsApi } from '@/features/goods-receipts/api'
import { useReceivablePOs } from '@/features/goods-receipts/hooks/useReceivablePOs'

// api.ts already maps {data,meta} -> ReceivablePO[]; the hook returns that array.
const fake: ReceivablePO[] = [
  { id: 1, poNumber: 'PO-2025-0001', status: 'acknowledged' },
  { id: 2, poNumber: 'PO-2025-0002', status: 'partially_received' },
]

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function makeWrapper(qc: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useReceivablePOs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches receivable POs and caches them at the purchase-orders receivable key', async () => {
    vi.mocked(goodsReceiptsApi.listReceivablePOs).mockResolvedValue(fake)
    const qc = makeQc()
    const { result } = renderHook(() => useReceivablePOs(), {
      wrapper: makeWrapper(qc),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(goodsReceiptsApi.listReceivablePOs).toHaveBeenCalledWith()
    expect(result.current.data).toEqual(fake)
    // pin the queryKey: GRN-create invalidates the ['purchase-orders'] prefix so a
    // completed PO drops out of this picker; that cross-hook contract regresses
    // silently if this key is renamed, so lock it here.
    expect(qc.getQueryData(['purchase-orders', 'receivable'])).toEqual(fake)
  })

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => useReceivablePOs({ enabled: false }), {
      wrapper: makeWrapper(makeQc()),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(goodsReceiptsApi.listReceivablePOs).not.toHaveBeenCalled()
  })
})
