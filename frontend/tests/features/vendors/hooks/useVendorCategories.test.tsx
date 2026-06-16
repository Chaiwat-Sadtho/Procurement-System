import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/features/vendors/api', () => ({
  vendorCategoriesApi: { list: vi.fn() },
}))

import { vendorCategoriesApi } from '@/features/vendors/api'
import { useVendorCategories } from '@/features/vendors/hooks/useVendorCategories'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useVendorCategories', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches categories and returns the array', async () => {
    const cats = [{ id: 1, name: 'Hardware' }]
    vi.mocked(vendorCategoriesApi.list).mockResolvedValue(cats)
    const { result } = renderHook(() => useVendorCategories(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vendorCategoriesApi.list).toHaveBeenCalled()
    expect(result.current.data).toEqual(cats)
  })
})
