import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { VendorRatingsResponse } from '../types'

vi.mock('../api', () => ({
  vendorsApi: { getRatings: vi.fn() },
}))

import { vendorsApi } from '../api'
import { useVendorRatings } from './useVendorRatings'

const page1 = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
} as VendorRatingsResponse

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useVendorRatings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches ratings for the vendor with page/limit params', async () => {
    vi.mocked(vendorsApi.getRatings).mockResolvedValue(page1)
    const { result } = renderHook(() => useVendorRatings(3, { page: 1, limit: 20 }), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(page1))
    expect(vendorsApi.getRatings).toHaveBeenCalledWith(3, { page: 1, limit: 20 })
  })

  it('does not fetch for invalid vendor id', () => {
    renderHook(() => useVendorRatings(0, { page: 1, limit: 20 }), { wrapper })
    expect(vendorsApi.getRatings).not.toHaveBeenCalled()
  })
})
