import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Sidebar, NavGroupSection } from './Sidebar'
import type { User } from '@/shared/types'

vi.mock('@/shared/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

const baseUser: Omit<User, 'role'> = {
  id: 1,
  email: 'u@example.com',
  firstName: 'ทดสอบ',
  middleName: null,
  lastName: 'ผู้ใช้',
  fullName: 'ทดสอบ ผู้ใช้',
  isActive: true,
  departmentId: 1,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function makeUser(role: User['role']): User {
  return { ...baseUser, role }
}

function renderSidebar(role: User['role'], initialPath = '/dashboard') {
  vi.mocked(useCurrentUser).mockReturnValue({
    data: makeUser(role),
    isLoading: false,
  } as ReturnType<typeof useCurrentUser>)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Sidebar nav — flat top-level items (regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('still renders Dashboard, Vendors, Budgets, Users and Settings for procurement_officer', () => {
    renderSidebar('procurement_officer')
    expect(screen.getByRole('link', { name: 'แดชบอร์ด' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'ผู้ขาย' })).toHaveAttribute('href', '/vendors')
    expect(screen.getByRole('link', { name: 'งบประมาณ' })).toHaveAttribute('href', '/budgets')
    expect(screen.getByRole('link', { name: 'ผู้ใช้งาน' })).toHaveAttribute('href', '/users')
    expect(screen.getByRole('link', { name: 'ตั้งค่า' })).toHaveAttribute('href', '/settings')
  })

  it('hides procurement-only and manager-only items from an employee', () => {
    renderSidebar('employee')
    expect(screen.getByRole('link', { name: 'แดชบอร์ด' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ตั้งค่า' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ผู้ขาย' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'งบประมาณ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ผู้ใช้งาน' })).not.toBeInTheDocument()
  })

  it('hides Users from a manager but keeps Vendors and Budgets', () => {
    renderSidebar('manager')
    expect(screen.getByRole('link', { name: 'ผู้ขาย' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'งบประมาณ' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ผู้ใช้งาน' })).not.toBeInTheDocument()
  })
})

describe('Sidebar nav — group renders children', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the จัดซื้อ group header with its three children for procurement_officer', () => {
    renderSidebar('procurement_officer')
    const header = screen.getByRole('button', { name: 'จัดซื้อ' })
    expect(header).toBeInTheDocument()
    // Scope to the group's own child list so a flat-sibling regression (children
    // rendered OUTSIDE the group) would fail rather than pass — group membership
    // is the whole point of Slice F.
    const list = document.getElementById(header.getAttribute('aria-controls') as string)
    expect(list).not.toBeNull()
    const group = within(list as HTMLElement)
    expect(group.getByRole('link', { name: 'ใบขอซื้อ' })).toHaveAttribute(
      'href',
      '/purchase-requests',
    )
    expect(group.getByRole('link', { name: 'ใบสั่งซื้อ' })).toHaveAttribute(
      'href',
      '/purchase-orders',
    )
    expect(group.getByRole('link', { name: 'รับของ' })).toHaveAttribute(
      'href',
      '/goods-receipts',
    )
  })

  it('orders top-level entries Dashboard, จัดซื้อ group, then master-data links', () => {
    renderSidebar('procurement_officer')
    const nav = screen.getByRole('navigation')
    // getAllByRole takes a SINGLE role string — query each role separately,
    // then order by DOM position (compareDocumentPosition) instead of a mixed query.
    const dashboard = within(nav).getByRole('link', { name: 'แดชบอร์ด' })
    const groupHeader = within(nav).getByRole('button', { name: 'จัดซื้อ' })
    const vendors = within(nav).getByRole('link', { name: 'ผู้ขาย' })
    const budgets = within(nav).getByRole('link', { name: 'งบประมาณ' })

    // a.compareDocumentPosition(b) & FOLLOWING (4) === b comes after a in document order.
    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
    expect(dashboard.compareDocumentPosition(groupHeader) & FOLLOWING).toBeTruthy()
    expect(groupHeader.compareDocumentPosition(vendors) & FOLLOWING).toBeTruthy()
    expect(vendors.compareDocumentPosition(budgets) & FOLLOWING).toBeTruthy()
  })
})

describe('Sidebar nav — group toggle, a11y and persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('wires aria-expanded and aria-controls to the child list', () => {
    renderSidebar('procurement_officer')
    const header = screen.getByRole('button', { name: 'จัดซื้อ' })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    const controls = header.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    const list = document.getElementById(controls as string)
    expect(list).not.toBeNull()
    expect(
      within(list as HTMLElement).getByRole('link', { name: 'ใบสั่งซื้อ' }),
    ).toBeInTheDocument()
  })

  it('collapses the group on click, hiding its children and flipping aria-expanded', async () => {
    const user = userEvent.setup()
    renderSidebar('procurement_officer')
    const header = screen.getByRole('button', { name: 'จัดซื้อ' })
    expect(screen.getByRole('link', { name: 'ใบสั่งซื้อ' })).toBeInTheDocument()

    await user.click(header)

    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'ใบสั่งซื้อ' })).not.toBeInTheDocument()
  })

  it('persists the collapsed state to localStorage and restores it on remount', async () => {
    const user = userEvent.setup()
    const first = renderSidebar('procurement_officer')
    await user.click(screen.getByRole('button', { name: 'จัดซื้อ' }))
    expect(localStorage.getItem('sidebar-group:จัดซื้อ')).toBe('collapsed')
    first.unmount()

    // Remount on a non-purchasing route so auto-expand does not override persistence.
    renderSidebar('procurement_officer', '/dashboard')
    expect(screen.getByRole('button', { name: 'จัดซื้อ' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByRole('link', { name: 'ใบสั่งซื้อ' })).not.toBeInTheDocument()
  })
})

describe('Sidebar nav — auto-expand active child and role-filtered group', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('auto-expands the group when the current route is one of its children', () => {
    renderSidebar('procurement_officer', '/purchase-orders')
    const header = screen.getByRole('button', { name: 'จัดซื้อ' })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'ใบสั่งซื้อ' })).toBeInTheDocument()
  })

  it('auto-expands on a nested child route (e.g. /purchase-orders/5)', () => {
    renderSidebar('procurement_officer', '/purchase-orders/5')
    expect(screen.getByRole('button', { name: 'จัดซื้อ' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps the group expanded on an active child even when localStorage says collapsed', () => {
    localStorage.setItem('sidebar-group:จัดซื้อ', 'collapsed')
    renderSidebar('procurement_officer', '/goods-receipts')
    expect(screen.getByRole('button', { name: 'จัดซื้อ' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'รับของ' })).toBeInTheDocument()
  })

  it('still lets the user collapse the group with an explicit click while on an active child route', async () => {
    const user = userEvent.setup()
    renderSidebar('procurement_officer', '/purchase-orders')
    const header = screen.getByRole('button', { name: 'จัดซื้อ' })
    // auto-expanded because the active route is a child (spec §8)
    expect(header).toHaveAttribute('aria-expanded', 'true')

    // an explicit toggle MUST take effect — the header is never a dead control
    await user.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'ใบสั่งซื้อ' })).not.toBeInTheDocument()
  })

  it('still shows the group for an employee because Purchase Requests remains allowed', () => {
    renderSidebar('employee', '/dashboard')
    expect(screen.getByRole('button', { name: 'จัดซื้อ' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ใบขอซื้อ' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ใบสั่งซื้อ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'รับของ' })).not.toBeInTheDocument()
  })

  it('hides the entire group header when role filtering empties all children', () => {
    // Synthetic group whose only child is procurement-only, viewed as an employee
    // → every child filtered out → header must not render.
    vi.mocked(useCurrentUser).mockReturnValue({
      data: makeUser('employee'),
      isLoading: false,
    } as ReturnType<typeof useCurrentUser>)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <NavGroupSection
            group={{
              kind: 'group',
              label: 'เฉพาะจัดซื้อ',
              icon: Users,
              children: [
                {
                  kind: 'link',
                  label: 'Users',
                  path: '/users',
                  allowedRoles: ['procurement_officer'],
                  icon: Users,
                },
              ],
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('button', { name: 'เฉพาะจัดซื้อ' })).not.toBeInTheDocument()
  })
})
