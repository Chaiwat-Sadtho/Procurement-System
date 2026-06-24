import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const handlers: Record<string, (...args: unknown[]) => void> = {}
const fakeSocket = {
  on: vi.fn((event: string, h: (...args: unknown[]) => void) => {
    handlers[event] = h
  }),
  off: vi.fn(),
  io: { on: vi.fn(), off: vi.fn() },
  disconnect: vi.fn(),
}

vi.mock('@/shared/lib/socket', () => ({
  connectNotificationSocket: vi.fn(() => fakeSocket),
  disconnectNotificationSocket: vi.fn(),
  getNotificationSocket: vi.fn(() => fakeSocket),
}))
vi.mock('sonner', () => ({ toast: vi.fn() }))

import { toast } from 'sonner'
import { connectNotificationSocket } from '@/shared/lib/socket'
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket'

function makeWrapper(qc: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useNotificationSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(handlers)) delete handlers[k]
    localStorage.setItem('token', 'jwt-token')
  })

  it('connects with the stored token and toasts + invalidates on notification:new', async () => {
    const qc = new QueryClient()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    renderHook(() => useNotificationSocket(), { wrapper: makeWrapper(qc) })

    expect(connectNotificationSocket).toHaveBeenCalledWith('jwt-token')

    handlers['notification:new']({ title: 'มี PR ใหม่', message: 'PR-2026-0001' })

    expect(toast).toHaveBeenCalled()
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] }))
  })

  it('does not connect when there is no token', () => {
    localStorage.removeItem('token')
    const qc = new QueryClient()
    renderHook(() => useNotificationSocket(), { wrapper: makeWrapper(qc) })
    expect(connectNotificationSocket).not.toHaveBeenCalled()
  })
})
