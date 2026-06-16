import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Vendor } from '@/features/vendors/types'

vi.mock('@/features/vendors/api', () => ({
  vendorsApi: {
    get: vi.fn(),
    blacklist: vi.fn(),
    unblacklist: vi.fn(),
  },
}))

import { vendorsApi } from '@/features/vendors/api'
import { useVendor } from '@/features/vendors/hooks/useVendor'

const fakeVendor = { id: 7 } as Vendor

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useVendor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches the vendor by id', async () => {
    vi.mocked(vendorsApi.get).mockResolvedValue(fakeVendor)
    renderHook(() => useVendor(7), { wrapper })
    await waitFor(() => expect(vendorsApi.get).toHaveBeenCalledWith(7))
  })

  it('does not fetch when id is 0 (disabled)', () => {
    renderHook(() => useVendor(0), { wrapper })
    expect(vendorsApi.get).not.toHaveBeenCalled()
  })

  it('blacklist mutation calls api.blacklist with the reason', async () => {
    vi.mocked(vendorsApi.get).mockResolvedValue(fakeVendor)
    vi.mocked(vendorsApi.blacklist).mockResolvedValue(fakeVendor)
    const { result } = renderHook(() => useVendor(7), { wrapper })
    await result.current.blacklistMutation.mutateAsync('ส่งของช้า')
    expect(vendorsApi.blacklist).toHaveBeenCalledWith(7, 'ส่งของช้า')
  })

  it('unblacklist mutation calls api.unblacklist with the id', async () => {
    vi.mocked(vendorsApi.get).mockResolvedValue(fakeVendor)
    vi.mocked(vendorsApi.unblacklist).mockResolvedValue(fakeVendor)
    const { result } = renderHook(() => useVendor(7), { wrapper })
    await result.current.unblacklistMutation.mutateAsync()
    expect(vendorsApi.unblacklist).toHaveBeenCalledWith(7)
  })
})
