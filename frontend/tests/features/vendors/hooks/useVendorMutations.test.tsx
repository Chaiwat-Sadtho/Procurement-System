import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Vendor, VendorPayload } from '@/features/vendors/types'

vi.mock('@/features/vendors/api', () => ({
  vendorsApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

import { vendorsApi } from '@/features/vendors/api'
import { useVendorMutations } from '@/features/vendors/hooks/useVendorMutations'

const fakeVendor = { id: 9 } as Vendor
const payload: VendorPayload = {
  name: 'ACME',
  taxId: null,
  email: null,
  phone: null,
  address: null,
  categoryIds: [1],
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useVendorMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create calls api.create with the payload', async () => {
    vi.mocked(vendorsApi.create).mockResolvedValue(fakeVendor)
    const { result } = renderHook(() => useVendorMutations(), { wrapper })
    await result.current.createMutation.mutateAsync(payload)
    expect(vendorsApi.create).toHaveBeenCalledWith(payload)
  })

  it('update calls api.update with id + data', async () => {
    vi.mocked(vendorsApi.update).mockResolvedValue(fakeVendor)
    const { result } = renderHook(() => useVendorMutations(), { wrapper })
    await result.current.updateMutation.mutateAsync({ id: 3, data: payload })
    expect(vendorsApi.update).toHaveBeenCalledWith(3, payload)
  })
})
