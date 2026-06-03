import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ReceivablePO } from '../types'

vi.mock('../api', () => ({
  goodsReceiptsApi: { listReceivablePOs: vi.fn() },
}))

import { goodsReceiptsApi } from '../api'
import { useReceivablePOs } from './useReceivablePOs'

// api.ts already maps {data,meta} -> ReceivablePO[]; the hook returns that array.
const fake: ReceivablePO[] = [
  { id: 1, poNumber: 'PO-2025-0001', status: 'acknowledged' },
  { id: 2, poNumber: 'PO-2025-0002', status: 'partially_received' },
]

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useReceivablePOs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches receivable POs and returns the mapped array', async () => {
    vi.mocked(goodsReceiptsApi.listReceivablePOs).mockResolvedValue(fake)
    const { result } = renderHook(() => useReceivablePOs(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(goodsReceiptsApi.listReceivablePOs).toHaveBeenCalledWith()
    expect(result.current.data).toEqual(fake)
  })

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => useReceivablePOs({ enabled: false }), {
      wrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(goodsReceiptsApi.listReceivablePOs).not.toHaveBeenCalled()
  })
})
