import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

import { usePurchaseRequests } from '../hooks/usePurchaseRequests'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
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

const mockUser: User = {
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PRListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PRListPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading skeleton when fetching', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as ReturnType<typeof useCurrentUser>)

    vi.mocked(usePurchaseRequests).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usePurchaseRequests>)

    renderPage()
    expect(screen.getByTestId('pr-list-loading')).toBeInTheDocument()
  })

  it('renders PR list when data is loaded', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as ReturnType<typeof useCurrentUser>)

    vi.mocked(usePurchaseRequests).mockReturnValue({
      data: {
        data: [mockPR],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
    } as ReturnType<typeof usePurchaseRequests>)

    renderPage()
    expect(screen.getByText('PR-2025-0001')).toBeInTheDocument()
    expect(screen.getByText('Office Supplies')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows New PR button for employee role', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as ReturnType<typeof useCurrentUser>)

    vi.mocked(usePurchaseRequests).mockReturnValue({
      data: { data: [] as PurchaseRequest[], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
    } as ReturnType<typeof usePurchaseRequests>)

    renderPage()
    expect(screen.getByRole('link', { name: /new pr/i })).toBeInTheDocument()
  })
})
