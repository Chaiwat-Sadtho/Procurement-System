import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { GoodsReceipt, CreateGoodsReceiptPayload } from '../types'

vi.mock('../api', () => ({
  goodsReceiptsApi: { create: vi.fn() },
}))

import { goodsReceiptsApi } from '../api'
import { useGRNMutations } from './useGRNMutations'

// created.poId drives the PO-detail/grn-history invalidation prefix (contract §5)
const created = { id: 42, poId: 9, status: 'partial' } as GoodsReceipt

const payload: CreateGoodsReceiptPayload = {
  poId: 9,
  receivedDate: '2025-11-10',
  items: [{ poItemId: 3, receivedQuantity: 2, condition: 'good' }],
}

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

describe('useGRNMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create calls api.create with the payload and invalidates GRN list + PO detail + PO list', async () => {
    vi.mocked(goodsReceiptsApi.create).mockResolvedValue(created)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useGRNMutations(), {
      wrapper: makeWrapper(qc),
    })

    // serial mutation — onSuccess invalidation fires after this resolves
    await result.current.createMutation.mutateAsync(payload)

    expect(goodsReceiptsApi.create).toHaveBeenCalledWith(payload)
    await waitFor(() => {
      // GRN list+detail (prefix ['goods-receipts'])
      expect(spy).toHaveBeenCalledWith({ queryKey: ['goods-receipts'] })
      // PO detail + its grn-history (prefix ['purchase-order', created.poId] covers both)
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-order', 9] })
      // PO list
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] })
    })
  })

  it('mutationFn is arrow-wrapped (api.create gets exactly the payload, no 2nd arg)', async () => {
    vi.mocked(goodsReceiptsApi.create).mockResolvedValue(created)
    const qc = makeQc()
    const { result } = renderHook(() => useGRNMutations(), {
      wrapper: makeWrapper(qc),
    })
    await result.current.createMutation.mutateAsync(payload)
    // TanStack v5 passes (variables, context) to mutationFn; an unwrapped
    // mutationFn: goodsReceiptsApi.create would receive 2 args and fail this.
    expect(goodsReceiptsApi.create).toHaveBeenCalledTimes(1)
    expect(goodsReceiptsApi.create).toHaveBeenCalledWith(payload)
  })
})
