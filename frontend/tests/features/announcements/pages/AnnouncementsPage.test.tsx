import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Announcement } from '@/features/announcements/types'

const rows: Announcement[] = [
  {
    id: 1,
    title: 'ปิดปรับปรุงระบบ',
    detail: 'เสาร์นี้',
    icon: 'megaphone',
    isActive: true,
    isPinned: true,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
]

vi.mock('@/features/announcements/hooks/useAnnouncements', () => ({
  useAnnouncements: () => ({ data: rows, isLoading: false, isError: false }),
}))
vi.mock('@/features/announcements/hooks/useAnnouncementMutations', () => ({
  useAnnouncementMutations: () => ({
    createMutation: { mutate: vi.fn(), isPending: false },
    updateMutation: { mutate: vi.fn(), isPending: false },
    deleteMutation: { mutate: vi.fn(), isPending: false },
  }),
}))

import { AnnouncementsPage } from '@/features/announcements/pages/AnnouncementsPage'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('AnnouncementsPage', () => {
  it('renders announcement rows from the hook', () => {
    render(<AnnouncementsPage />, { wrapper })
    expect(screen.getByText('ปิดปรับปรุงระบบ')).toBeInTheDocument()
  })

  it('opens the create dialog from the add button', async () => {
    render(<AnnouncementsPage />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มประกาศ' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
