import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    publicData.current = [{ id: 1, title: 'ประกาศจริง', detail: 'จาก API', icon: 'megaphone' }]
    render(<LoginPage />, { wrapper })
    expect(screen.getByText('ประกาศจริง')).toBeInTheDocument()
  })

  it('shows an empty hint when there are no announcements', () => {
    publicData.current = []
    render(<LoginPage />, { wrapper })
    expect(screen.getByText('ยังไม่มีประกาศ')).toBeInTheDocument()
  })
})
