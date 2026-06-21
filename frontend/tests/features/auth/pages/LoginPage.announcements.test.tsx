import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { PublicAnnouncement } from '@/features/announcements/types'

const publicData: { current: PublicAnnouncement[] } = { current: [] }

vi.mock('@/features/announcements/hooks/usePublicAnnouncements', () => ({
  usePublicAnnouncements: () => ({ data: publicData.current, isLoading: false }),
}))

import { LoginPage } from '@/features/auth/pages/LoginPage'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage announcements', () => {
  it('renders fetched announcements', () => {
    publicData.current = [
      { id: 1, title: 'ประกาศจริง', detail: 'จาก API', icon: 'megaphone', isPinned: false },
    ]
    render(<LoginPage />, { wrapper })
    expect(screen.getByText('ประกาศจริง')).toBeInTheDocument()
  })

  it('shows an empty hint when there are no announcements', () => {
    publicData.current = []
    render(<LoginPage />, { wrapper })
    expect(screen.getByText('ยังไม่มีประกาศ')).toBeInTheDocument()
  })

  it('marks only pinned announcements with a "ปักหมุด" badge', () => {
    publicData.current = [
      { id: 1, title: 'ประกาศสำคัญ', detail: 'รายละเอียดหนึ่ง', icon: 'megaphone', isPinned: true },
      { id: 2, title: 'ประกาศทั่วไป', detail: 'รายละเอียดสอง', icon: 'file', isPinned: false },
    ]
    render(<LoginPage />, { wrapper })
    expect(screen.getAllByText('ปักหมุด')).toHaveLength(1)
    const pinned = screen.getByText('ประกาศสำคัญ').closest('li') as HTMLElement
    expect(within(pinned).getByText('ปักหมุด')).toBeInTheDocument()
    const normal = screen.getByText('ประกาศทั่วไป').closest('li') as HTMLElement
    expect(within(normal).queryByText('ปักหมุด')).toBeNull()
  })

  it('renders all announcements in one list in data order (row-major fill)', () => {
    const six: PublicAnnouncement[] = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      title: `ประกาศ${i + 1}`,
      detail: 'รายละเอียด',
      icon: 'megaphone',
      isPinned: false,
    }))
    publicData.current = six
    render(<LoginPage />, { wrapper })
    const aside = screen.getByRole('complementary')
    expect(within(aside).getAllByRole('list')).toHaveLength(1)
    const titles = within(aside)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('p.font-medium')?.textContent)
    expect(titles).toEqual(['ประกาศ1', 'ประกาศ2', 'ประกาศ3', 'ประกาศ4', 'ประกาศ5', 'ประกาศ6'])
  })
})
