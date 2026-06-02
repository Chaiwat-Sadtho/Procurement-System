import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { VendorListResponse } from '../types'

vi.mock('../api', () => ({
  vendorsApi: { list: vi.fn() },
}))

import { vendorsApi } from '../api'
import { useVendors } from './useVendors'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const fake: VendorListResponse = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
}

describe('useVendors', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls vendorsApi.list with params and unwraps the data', async () => {
    vi.mocked(vendorsApi.list).mockResolvedValue(fake)
    const params = { page: 1, limit: 20, search: 'ACME' }
    const { result } = renderHook(() => useVendors(params), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vendorsApi.list).toHaveBeenCalledWith(params)
    expect(result.current.data).toEqual(fake)
  })

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => useVendors({}, { enabled: false }), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(vendorsApi.list).not.toHaveBeenCalled()
  })
})
