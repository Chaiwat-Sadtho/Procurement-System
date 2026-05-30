import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PRListPage } from './PRListPage'
import type { PurchaseRequest } from '../types'

vi.mock('../hooks/usePurchaseRequests', () => ({
  usePurchaseRequests: vi.fn(),
}))

vi.mock('@/shared/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/features/users/hooks/useUsers', () => ({
  useUsers: vi.fn(),
}))

import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { User } from '@/shared/types'

const mockPR: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2025-0001',
  title: 'Office Supplies',
  status: 'draft',
  totalEstimatedAmount: 5000,
  quarter: null,
  requiredDate: '2025-02-01',
  requesterId: 1,
  requester: { id: 1, fullName: 'Test User', email: 'test@example.com' },
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  approvedBy: null,
  approver: null,
  approvedAt: null,
  rejectReason: null,
  items: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const baseUser: User = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  middleName: null,
  lastName: 'User',
  fullName: 'Test User',
  role: 'employee',
  isActive: true,
  departmentId: 1,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

function setupMocks({
  user = baseUser,
  prData,
  isLoading = false,
}: {
  user?: User
  prData?: { data: PurchaseRequest[]; meta: { page: number; limit: number; total: number; totalPages: number } } | undefined
  isLoading?: boolean
}) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: user, isLoading: false } as ReturnType<typeof useCurrentUser>)
  vi.mocked(usePurchaseRequests).mockReturnValue({ data: prData, isLoading } as ReturnType<typeof usePurchaseRequests>)
  vi.mocked(useUsers).mockReturnValue({ data: undefined } as ReturnType<typeof useUsers>)
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PRListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function searchDateRange() {
  await userEvent.type(screen.getByLabelText(/วันที่เริ่มต้น/i), '01012569')
  const to = screen.getByLabelText(/วันที่สิ้นสุด/i)
  await userEvent.clear(to)
  await userEvent.type(to, '31122569')
  await userEvent.click(screen.getByRole('button', { name: /ค้นหา/i }))
}

describe('PRListPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('initial state: form visible + prompt message + usePurchaseRequests called with enabled=false', () => {
    setupMocks({ prData: undefined })

    renderPage()
    expect(screen.getByRole('button', { name: /ค้นหา/i })).toBeInTheDocument()
    expect(screen.getByText(/กรุณาเลือกช่วงวันที่และกดค้นหา/i)).toBeInTheDocument()
    expect(vi.mocked(usePurchaseRequests).mock.calls[0][1]).toEqual({ enabled: false })
  })

  it('after submit with valid dates: usePurchaseRequests called with filter params', async () => {
    setupMocks({ prData: undefined })

    renderPage()
    await searchDateRange()

    const lastCall = vi.mocked(usePurchaseRequests).mock.calls.at(-1)!
    expect(lastCall[0]).toEqual(
      expect.objectContaining({ from: '2026-01-01', to: '2026-12-31', page: 1 }),
    )
    expect(lastCall[1]).toEqual({ enabled: true })
  })

  it('Employee: form has no Requester field, useUsers not enabled', () => {
    setupMocks({ user: { ...baseUser, role: 'employee' }, prData: undefined })

    renderPage()
    expect(screen.queryByLabelText(/ผู้ขอ/i)).not.toBeInTheDocument()
    expect(vi.mocked(useUsers)).toHaveBeenCalledWith({ enabled: false })
  })

  it('Manager: form has Requester field + useUsers enabled', () => {
    setupMocks({ user: { ...baseUser, role: 'manager' }, prData: undefined })

    renderPage()
    expect(screen.getByLabelText(/ผู้ขอ/i)).toBeInTheDocument()
    expect(vi.mocked(useUsers)).toHaveBeenCalledWith({ enabled: true })
  })

  it('shows loading skeleton after submit', async () => {
    setupMocks({ prData: undefined, isLoading: true })

    renderPage()
    await searchDateRange()

    expect(screen.getByTestId('pr-list-loading')).toBeInTheDocument()
  })

  it('renders table with bg-table-header + table-fixed when data is loaded', async () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    })

    renderPage()
    await searchDateRange()

    expect(screen.getByText('PR-2025-0001')).toBeInTheDocument()
    expect(screen.getByText('Office Supplies')).toBeInTheDocument()

    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')

    const thead = table.querySelector('thead')
    expect(thead).toHaveClass('bg-table-header')
  })

  it('ลำดับ column shows running number continuous across pagination', async () => {
    setupMocks({
      prData: {
        data: [mockPR, { ...mockPR, id: 2, prNumber: 'PR-2025-0002' }],
        meta: { page: 2, limit: 20, total: 22, totalPages: 2 },
      },
    })

    renderPage()
    await searchDateRange()

    // page=2, limit=20 → row 0 = 21, row 1 = 22
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('shows New PR button only for employee role', () => {
    setupMocks({
      user: { ...baseUser, role: 'employee' },
      prData: { data: [] as PurchaseRequest[], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    })

    renderPage()
    expect(screen.getByRole('link', { name: /new pr/i })).toBeInTheDocument()
  })

  it('ล้าง returns to initial prompt and disables the query', async () => {
    setupMocks({
      prData: { data: [mockPR], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    })

    renderPage()
    await searchDateRange()
    expect(screen.getByText('PR-2025-0001')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /ล้าง/i }))

    expect(screen.getByText(/กรุณาเลือกช่วงวันที่และกดค้นหา/i)).toBeInTheDocument()
    const lastCall = vi.mocked(usePurchaseRequests).mock.calls.at(-1)!
    expect(lastCall[1]).toEqual({ enabled: false })
  })
})
