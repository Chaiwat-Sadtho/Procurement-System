import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PRListResponse } from '@/features/purchase-requests/types'

vi.mock('@/features/purchase-requests/api', () => ({
  purchaseRequestsApi: { list: vi.fn() },
}))

import { purchaseRequestsApi } from '@/features/purchase-requests/api'
import { useEligiblePRs } from '@/features/purchase-orders/hooks/useEligiblePRs'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const fake: PRListResponse = {
  data: [],
  meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
}

describe('useEligiblePRs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches purchase requests with the eligibleForPo flag', async () => {
    vi.mocked(purchaseRequestsApi.list).mockResolvedValue(fake)
    const { result } = renderHook(() => useEligiblePRs(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(purchaseRequestsApi.list).toHaveBeenCalledWith({ eligibleForPo: true, limit: 100 })
    expect(result.current.data).toEqual(fake)
  })

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => useEligiblePRs({ enabled: false }), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(purchaseRequestsApi.list).not.toHaveBeenCalled()
  })
})
