import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PurchaseRequest } from '../types'

vi.mock('../api', () => ({
  purchaseRequestsApi: {
    create: vi.fn(),
    update: vi.fn(),
    submit: vi.fn(),
    remove: vi.fn(),
  },
}))

import { purchaseRequestsApi } from '../api'
import { usePRMutations } from './usePRMutations'

const fakePR = { id: 7 } as PurchaseRequest

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('usePRMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create calls api.create with the payload', async () => {
    vi.mocked(purchaseRequestsApi.create).mockResolvedValue(fakePR)
    const { result } = renderHook(() => usePRMutations(), { wrapper })
    const payload = { title: 'x', requiredDate: '2026-07-01', quarter: null, items: [] }
    await result.current.createMutation.mutateAsync(payload)
    expect(purchaseRequestsApi.create).toHaveBeenCalledWith(payload)
  })

  it('update calls api.update with id + data', async () => {
    vi.mocked(purchaseRequestsApi.update).mockResolvedValue(fakePR)
    const { result } = renderHook(() => usePRMutations(), { wrapper })
    await result.current.updateMutation.mutateAsync({ id: 3, data: { title: 'y' } })
    expect(purchaseRequestsApi.update).toHaveBeenCalledWith(3, { title: 'y' })
  })

  it('submit calls api.submit with id', async () => {
    vi.mocked(purchaseRequestsApi.submit).mockResolvedValue(fakePR)
    const { result } = renderHook(() => usePRMutations(), { wrapper })
    await result.current.submitMutation.mutateAsync(9)
    expect(purchaseRequestsApi.submit).toHaveBeenCalledWith(9)
  })

  it('delete calls api.remove with id', async () => {
    vi.mocked(purchaseRequestsApi.remove).mockResolvedValue(undefined)
    const { result } = renderHook(() => usePRMutations(), { wrapper })
    await result.current.deleteMutation.mutateAsync(4)
    await waitFor(() => expect(purchaseRequestsApi.remove).toHaveBeenCalledWith(4))
  })

  it('delete drops the stale detail-cache entry for that id', async () => {
    vi.mocked(purchaseRequestsApi.remove).mockResolvedValue(undefined)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    qc.setQueryData(['purchase-request', 4], { id: 4 } as PurchaseRequest)
    function localWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => usePRMutations(), { wrapper: localWrapper })
    await result.current.deleteMutation.mutateAsync(4)
    await waitFor(() => expect(qc.getQueryData(['purchase-request', 4])).toBeUndefined())
  })
})
