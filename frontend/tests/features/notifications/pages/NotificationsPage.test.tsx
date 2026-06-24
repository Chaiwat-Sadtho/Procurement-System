import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { NotificationListResponse } from '@/features/notifications/types'

vi.mock('@/features/notifications/api', () => ({
  notificationsApi: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

import { notificationsApi } from '@/features/notifications/api'
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage'

const page1: NotificationListResponse = {
  data: [
    {
      id: 1,
      title: 'PR อนุมัติแล้ว',
      message: 'PR-2026-0001 ได้รับการอนุมัติ',
      type: 'pr_approved',
      isRead: false,
      referenceId: 1,
      referenceType: 'PurchaseRequest',
      createdAt: new Date().toISOString(),
    },
  ],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('NotificationsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the notifications from the API', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue(page1)
    render(wrap(<NotificationsPage />))
    expect(await screen.findByText('PR อนุมัติแล้ว')).toBeInTheDocument()
  })

  it('shows an empty state when there are none', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })
    render(wrap(<NotificationsPage />))
    expect(await screen.findByText('ไม่มีการแจ้งเตือน')).toBeInTheDocument()
  })
})
