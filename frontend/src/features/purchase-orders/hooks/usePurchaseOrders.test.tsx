import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { POListResponse } from '../types'

vi.mock('../api', () => ({
  purchaseOrdersApi: { list: vi.fn() },
}))

import { purchaseOrdersApi } from '../api'
import { usePurchaseOrders } from './usePurchaseOrders'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const fake: POListResponse = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
}

describe('usePurchaseOrders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls purchaseOrdersApi.list with params and unwraps the data', async () => {
    vi.mocked(purchaseOrdersApi.list).mockResolvedValue(fake)
    const params = { page: 1, limit: 20, status: 'draft', vendorId: 5 } as const
    const { result } = renderHook(() => usePurchaseOrders(params), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(purchaseOrdersApi.list).toHaveBeenCalledWith(params)
    expect(result.current.data).toEqual(fake)
  })

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => usePurchaseOrders({}, { enabled: false }), {
      wrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(purchaseOrdersApi.list).not.toHaveBeenCalled()
  })
})
