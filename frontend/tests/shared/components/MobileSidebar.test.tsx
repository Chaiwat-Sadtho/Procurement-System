import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { MobileSidebar } from '@/shared/components/MobileSidebar'
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
    expect(screen.queryByRole('link', { name: 'แดชบอร์ด' })).not.toBeInTheDocument()
  })

  it('opens the drawer with nav and closes when a nav link is clicked', async () => {
    const user = userEvent.setup()
    renderMobileSidebar()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(await screen.findByRole('link', { name: 'แดชบอร์ด' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'แดชบอร์ด' }))
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'แดชบอร์ด' })).not.toBeInTheDocument()
    })
  })

  it('shows the จัดซื้อ group with Purchase Orders inside the mobile drawer', async () => {
    const user = userEvent.setup()
    renderMobileSidebar()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    const header = await screen.findByRole('button', { name: 'จัดซื้อ' })
    // Assert Purchase Orders is a CHILD of the group (not a flat sibling) so this
    // proves the group propagates through SidebarContent into the drawer.
    const list = document.getElementById(header.getAttribute('aria-controls') as string)
    expect(list).not.toBeNull()
    expect(
      within(list as HTMLElement).getByRole('link', { name: 'ใบสั่งซื้อ' }),
    ).toHaveAttribute('href', '/purchase-orders')
  })
})
