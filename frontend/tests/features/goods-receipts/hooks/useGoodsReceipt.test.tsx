import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { GoodsReceipt } from '@/features/goods-receipts/types'

vi.mock('@/features/goods-receipts/api', () => ({
  goodsReceiptsApi: { get: vi.fn() },
}))

import { goodsReceiptsApi } from '@/features/goods-receipts/api'
import { useGoodsReceipt } from '@/features/goods-receipts/hooks/useGoodsReceipt'

const fakeGrn = { id: 7, status: 'partial' } as GoodsReceipt

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function makeWrapper(qc: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useGoodsReceipt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches the detail keyed by id', async () => {
    vi.mocked(goodsReceiptsApi.get).mockResolvedValue(fakeGrn)
    const qc = makeQc()
    const { result } = renderHook(() => useGoodsReceipt(7), {
      wrapper: makeWrapper(qc),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(goodsReceiptsApi.get).toHaveBeenCalledWith(7)
    expect(result.current.data).toEqual(fakeGrn)
    expect(qc.getQueryData(['goods-receipts', 'detail', 7])).toEqual(fakeGrn)
  })

  it('does not fetch when id <= 0', () => {
    const { result } = renderHook(() => useGoodsReceipt(0), {
      wrapper: makeWrapper(makeQc()),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(goodsReceiptsApi.get).not.toHaveBeenCalled()
  })
})
