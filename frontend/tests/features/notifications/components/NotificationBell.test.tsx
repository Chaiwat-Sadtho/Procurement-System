import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

vi.mock('@/features/notifications/api', () => ({
  notificationsApi: {
    unreadCount: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

import { notificationsApi } from '@/features/notifications/api'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('NotificationBell', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the unread badge from the API', async () => {
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(3)
    render(wrap(<NotificationBell />))
    expect(await screen.findByText('3')).toBeInTheDocument()
  })

  it('caps the badge at 99+', async () => {
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(150)
    render(wrap(<NotificationBell />))
    expect(await screen.findByText('99+')).toBeInTheDocument()
  })

  it('renders no badge when there are zero unread', async () => {
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue(0)
    render(wrap(<NotificationBell />))
    // the bell button is present, but no numeric badge
    expect(screen.getByLabelText('การแจ้งเตือน')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('0')).not.toBeInTheDocument())
    expect(document.querySelector('.bg-red-600')).toBeNull()
  })
})
