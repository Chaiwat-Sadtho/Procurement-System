import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { User } from '@/shared/types'

vi.mock('../api', () => ({
  usersApi: { updateRole: vi.fn(), updateStatus: vi.fn() },
}))

import { usersApi } from '../api'
import { useUserMutations } from './useUserMutations'

const updated = { id: 7, role: 'manager', isActive: true } as User

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}
function makeWrapper(qc: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useUserMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updateRole calls api.updateRole(id, role) and invalidates [users] exactly once', async () => {
    vi.mocked(usersApi.updateRole).mockResolvedValue(updated)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useUserMutations(), { wrapper: makeWrapper(qc) })

    await result.current.updateRoleMutation.mutateAsync({ id: 7, role: 'manager' })

    expect(usersApi.updateRole).toHaveBeenCalledWith(7, 'manager')
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['users'] })
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  it('updateStatus calls api.updateStatus(id, isActive) and invalidates [users] exactly once', async () => {
    vi.mocked(usersApi.updateStatus).mockResolvedValue(updated)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useUserMutations(), { wrapper: makeWrapper(qc) })

    await result.current.updateStatusMutation.mutateAsync({ id: 7, isActive: false })

    expect(usersApi.updateStatus).toHaveBeenCalledWith(7, false)
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['users'] })
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
