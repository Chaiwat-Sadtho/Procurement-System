import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/features/notifications/api', () => ({
  notificationsApi: { markRead: vi.fn(), markAllRead: vi.fn() },
}))

import { notificationsApi } from '@/features/notifications/api'
import { useNotificationMutations } from '@/features/notifications/hooks/useNotificationMutations'

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

describe('useNotificationMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('markRead calls api.markRead and invalidates the notifications prefix', async () => {
    vi.mocked(notificationsApi.markRead).mockResolvedValue(undefined)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useNotificationMutations(), { wrapper: makeWrapper(qc) })

    await result.current.markReadMutation.mutateAsync(9)

    expect(notificationsApi.markRead).toHaveBeenCalledWith(9)
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] }))
  })

  it('markAllRead calls api.markAllRead and invalidates the prefix', async () => {
    vi.mocked(notificationsApi.markAllRead).mockResolvedValue(undefined)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useNotificationMutations(), { wrapper: makeWrapper(qc) })

    await result.current.markAllReadMutation.mutateAsync()

    expect(notificationsApi.markAllRead).toHaveBeenCalled()
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] }))
  })
})
