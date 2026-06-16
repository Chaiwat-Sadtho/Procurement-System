import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { VendorRating } from '@/features/purchase-orders/types'

vi.mock('@/features/purchase-orders/api', () => ({
  purchaseOrdersApi: { rate: vi.fn() },
}))

import { purchaseOrdersApi } from '@/features/purchase-orders/api'
import { useRateVendor } from '@/features/purchase-orders/hooks/useRateVendor'

const created = {
  id: 9,
  poId: 7,
  vendorId: 3,
  score: 4,
  comment: null,
  ratedBy: 2,
  createdAt: '2026-06-01T00:00:00Z',
} as VendorRating

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

describe('useRateVendor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rates the PO and invalidates the PO + vendor caches', async () => {
    vi.mocked(purchaseOrdersApi.rate).mockResolvedValue(created)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useRateVendor(7, 3), { wrapper: makeWrapper(qc) })

    await result.current.mutateAsync({ score: 4 })

    expect(purchaseOrdersApi.rate).toHaveBeenCalledWith(7, { score: 4 })
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2))
    expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-order', 7] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['vendor', 3] })
    // success must NOT touch the narrow rating sub-key (that is the error path)
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['purchase-order', 7, 'rating'] })
  })

  it('on error (409 already-rated race) invalidates the rating sub-key to resync read-only', async () => {
    vi.mocked(purchaseOrdersApi.rate).mockRejectedValue(new Error('conflict'))
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useRateVendor(7, 3), { wrapper: makeWrapper(qc) })

    await expect(result.current.mutateAsync({ score: 4 })).rejects.toThrow()

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ['purchase-order', 7, 'rating'] }),
    )
    // error path is narrow ONLY: never refetch the whole PO or vendor on a failed rate
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['purchase-order', 7] })
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['vendor', 3] })
  })
})
