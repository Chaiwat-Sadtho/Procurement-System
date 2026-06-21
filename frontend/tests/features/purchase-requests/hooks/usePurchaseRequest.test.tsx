import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

vi.mock('@/features/purchase-requests/api', () => ({
  purchaseRequestsApi: {
    get: vi.fn(),
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}))

import { purchaseRequestsApi } from '@/features/purchase-requests/api'
import { usePurchaseRequest } from '@/features/purchase-requests/hooks/usePurchaseRequest'

const fakePR = { id: 1 } as PurchaseRequest

describe('usePurchaseRequest dashboard invalidation', () => {
  beforeEach(() => vi.clearAllMocks())

  function clientWrapper(qc: QueryClient) {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
  }

  it('invalidates dashboard queries after approve', async () => {
    vi.mocked(purchaseRequestsApi.get).mockResolvedValue(fakePR)
    vi.mocked(purchaseRequestsApi.approve).mockResolvedValue(fakePR)
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => usePurchaseRequest(1), { wrapper: clientWrapper(qc) })

    await result.current.approveMutation.mutateAsync()

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['dashboard'] }))
  })
})
