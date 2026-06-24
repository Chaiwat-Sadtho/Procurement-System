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
import { connectNotificationSocket, disconnectNotificationSocket } from '@/shared/lib/socket'
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

    expect(toast).toHaveBeenCalledWith('มี PR ใหม่', { description: 'PR-2026-0001' })
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] }))
  })

  it('does not connect when there is no token', () => {
    localStorage.removeItem('token')
    const qc = new QueryClient()
    renderHook(() => useNotificationSocket(), { wrapper: makeWrapper(qc) })
    expect(connectNotificationSocket).not.toHaveBeenCalled()
  })

  it('removes all listeners and disconnects on unmount', () => {
    const qc = new QueryClient()
    const { unmount } = renderHook(() => useNotificationSocket(), { wrapper: makeWrapper(qc) })

    unmount()

    expect(fakeSocket.off).toHaveBeenCalledWith('notification:new', expect.any(Function))
    expect(fakeSocket.off).toHaveBeenCalledWith('connect_error', expect.any(Function))
    expect(fakeSocket.io.off).toHaveBeenCalledWith('reconnect', expect.any(Function))
    expect(disconnectNotificationSocket).toHaveBeenCalledTimes(1)
  })

  it('connect_error Unauthorized clears token and redirects to /login', () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })

    localStorage.setItem('token', 'jwt-token')
    const qc = new QueryClient()
    renderHook(() => useNotificationSocket(), { wrapper: makeWrapper(qc) })

    handlers['connect_error']({ message: 'Unauthorized' })

    expect(localStorage.getItem('token')).toBeNull()
    expect(window.location.href).toBe('/login')

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })
})
