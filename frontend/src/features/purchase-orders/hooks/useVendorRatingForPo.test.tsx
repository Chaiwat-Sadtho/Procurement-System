import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { VendorRating } from '../types'

vi.mock('../api', () => ({
  purchaseOrdersApi: { getRating: vi.fn() },
}))

import { purchaseOrdersApi } from '../api'
import { useVendorRatingForPo } from './useVendorRatingForPo'

const fakeRating = { id: 1, poId: 7, vendorId: 3, score: 4, comment: null, ratedBy: 2, createdAt: '2026-06-01T00:00:00Z' } as VendorRating

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useVendorRatingForPo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches the rating keyed by poId', async () => {
    vi.mocked(purchaseOrdersApi.getRating).mockResolvedValue(fakeRating)
    const { result } = renderHook(() => useVendorRatingForPo(7, { enabled: true }), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(fakeRating))
    expect(purchaseOrdersApi.getRating).toHaveBeenCalledWith(7)
  })

  it('does not fetch when disabled (enabled gate)', () => {
    renderHook(() => useVendorRatingForPo(7, { enabled: false }), { wrapper })
    expect(purchaseOrdersApi.getRating).not.toHaveBeenCalled()
  })

  it('does not fetch when poId is not positive (poId > 0 gate)', () => {
    renderHook(() => useVendorRatingForPo(0, { enabled: true }), { wrapper })
    expect(purchaseOrdersApi.getRating).not.toHaveBeenCalled()
  })

  it('fetches by default when no options are passed', async () => {
    vi.mocked(purchaseOrdersApi.getRating).mockResolvedValue(fakeRating)
    const { result } = renderHook(() => useVendorRatingForPo(7), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(fakeRating))
  })
})
