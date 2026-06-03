import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { GRNListResponse } from '../types'

vi.mock('../api', () => ({
  goodsReceiptsApi: { list: vi.fn() },
}))

import { goodsReceiptsApi } from '../api'
import { useGoodsReceipts } from './useGoodsReceipts'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const fake: GRNListResponse = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
}

describe('useGoodsReceipts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls goodsReceiptsApi.list with params and unwraps the data', async () => {
    vi.mocked(goodsReceiptsApi.list).mockResolvedValue(fake)
    const params = { page: 1, limit: 20, status: 'partial', poId: 5 } as const
    const { result } = renderHook(() => useGoodsReceipts(params), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(goodsReceiptsApi.list).toHaveBeenCalledWith(params)
    expect(result.current.data).toEqual(fake)
  })

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() => useGoodsReceipts({}, { enabled: false }), {
      wrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(goodsReceiptsApi.list).not.toHaveBeenCalled()
  })
})
