import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PurchaseOrder, GoodsReceiptSummary } from '@/features/purchase-orders/types'

vi.mock('@/features/purchase-orders/api', () => ({
  purchaseOrdersApi: {
    get: vi.fn(),
    send: vi.fn(),
    acknowledge: vi.fn(),
    cancel: vi.fn(),
    getGoodsReceipts: vi.fn(),
  },
}))

import { purchaseOrdersApi } from '@/features/purchase-orders/api'
import { usePurchaseOrder } from '@/features/purchase-orders/hooks/usePurchaseOrder'

const fakePO = { id: 7, status: 'draft' } as PurchaseOrder
const fakeGrns: GoodsReceiptSummary[] = []

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

describe('usePurchaseOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches the detail keyed by id', async () => {
    vi.mocked(purchaseOrdersApi.get).mockResolvedValue(fakePO)
    vi.mocked(purchaseOrdersApi.getGoodsReceipts).mockResolvedValue(fakeGrns)
    const { result } = renderHook(() => usePurchaseOrder(7), {
      wrapper: makeWrapper(makeQc()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(purchaseOrdersApi.get).toHaveBeenCalledWith(7)
    expect(result.current.data).toEqual(fakePO)
  })

  it('does not fetch detail or grns when id <= 0', () => {
    const { result } = renderHook(() => usePurchaseOrder(0), {
      wrapper: makeWrapper(makeQc()),
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.grnsQuery.fetchStatus).toBe('idle')
    expect(purchaseOrdersApi.get).not.toHaveBeenCalled()
    expect(purchaseOrdersApi.getGoodsReceipts).not.toHaveBeenCalled()
  })

  it('grns query is keyed by id and unwraps the bare array', async () => {
    vi.mocked(purchaseOrdersApi.get).mockResolvedValue(fakePO)
    const grns = [{ id: 1 } as GoodsReceiptSummary]
    vi.mocked(purchaseOrdersApi.getGoodsReceipts).mockResolvedValue(grns)
    const qc = makeQc()
    const { result } = renderHook(() => usePurchaseOrder(7), {
      wrapper: makeWrapper(qc),
    })
    await waitFor(() => expect(result.current.grnsQuery.isSuccess).toBe(true))
    expect(purchaseOrdersApi.getGoodsReceipts).toHaveBeenCalledWith(7)
    expect(result.current.grnsQuery.data).toEqual(grns)
    expect(qc.getQueryData(['purchase-order', 7, 'grns'])).toEqual(grns)
  })

  it('send mutation calls api.send and invalidates singular + plural', async () => {
    vi.mocked(purchaseOrdersApi.get).mockResolvedValue(fakePO)
    vi.mocked(purchaseOrdersApi.getGoodsReceipts).mockResolvedValue(fakeGrns)
    vi.mocked(purchaseOrdersApi.send).mockResolvedValue(fakePO)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePurchaseOrder(7), {
      wrapper: makeWrapper(qc),
    })
    await result.current.sendMutation.mutateAsync()
    expect(purchaseOrdersApi.send).toHaveBeenCalledWith(7)
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-order', 7] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] })
    })
  })

  it('acknowledge mutation calls api.acknowledge and invalidates singular + plural', async () => {
    vi.mocked(purchaseOrdersApi.get).mockResolvedValue(fakePO)
    vi.mocked(purchaseOrdersApi.getGoodsReceipts).mockResolvedValue(fakeGrns)
    vi.mocked(purchaseOrdersApi.acknowledge).mockResolvedValue(fakePO)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePurchaseOrder(7), {
      wrapper: makeWrapper(qc),
    })
    await result.current.acknowledgeMutation.mutateAsync()
    expect(purchaseOrdersApi.acknowledge).toHaveBeenCalledWith(7)
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-order', 7] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] })
    })
  })

  it('cancel mutation calls api.cancel and invalidates singular + plural', async () => {
    vi.mocked(purchaseOrdersApi.get).mockResolvedValue(fakePO)
    vi.mocked(purchaseOrdersApi.getGoodsReceipts).mockResolvedValue(fakeGrns)
    vi.mocked(purchaseOrdersApi.cancel).mockResolvedValue(fakePO)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePurchaseOrder(7), {
      wrapper: makeWrapper(qc),
    })
    await result.current.cancelMutation.mutateAsync()
    expect(purchaseOrdersApi.cancel).toHaveBeenCalledWith(7)
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-order', 7] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] })
    })
  })
})
