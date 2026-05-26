import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { MobileSidebar } from './MobileSidebar'
import type { User } from '@/shared/types'

vi.mock('@/shared/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

const managerUser: User = {
  id: 2,
  email: 'mgr@example.com',
  firstName: 'สมหญิง',
  middleName: null,
  lastName: 'รักงาน',
  fullName: 'สมหญิง รักงาน',
  role: 'manager',
  isActive: true,
  departmentId: 1,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function renderMobileSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MobileSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MobileSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCurrentUser).mockReturnValue({
      data: managerUser,
      isLoading: false,
    } as ReturnType<typeof useCurrentUser>)
  })

  it('keeps nav hidden until the menu button is clicked', () => {
    renderMobileSidebar()
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('opens the drawer with nav and closes when a nav link is clicked', async () => {
    const user = userEvent.setup()
    renderMobileSidebar()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(await screen.findByRole('link', { name: 'Dashboard' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Dashboard' }))
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
    })
  })
})
