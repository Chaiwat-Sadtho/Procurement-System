import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/features/dashboard/hooks/useRecentPRs', () => ({ useRecentPRs: vi.fn() }))
import { useRecentPRs } from '@/features/dashboard/hooks/useRecentPRs'
import { RecentPRsTable } from '@/features/dashboard/components/RecentPRsTable'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

const pr: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2026-0001',
  title: 'Laptop',
  status: 'submitted',
  totalEstimatedAmount: 5000,
  quarter: null,
  requiredDate: '2026-02-01',
  requesterId: 1,
  requester: { id: 1, fullName: 'A B', email: 'a@b.com' },
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  approvedBy: null,
  approver: null,
  approvedAt: null,
  rejectReason: null,
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderTable() {
  return render(
    <MemoryRouter>
      <RecentPRsTable />
    </MemoryRouter>,
  )
}

describe('RecentPRsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders rows when data present', () => {
    vi.mocked(useRecentPRs).mockReturnValue({ data: [pr], isLoading: false } as ReturnType<
      typeof useRecentPRs
    >)
    renderTable()
    expect(screen.getByText('PR-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('Laptop')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    vi.mocked(useRecentPRs).mockReturnValue({
      data: [] as PurchaseRequest[],
      isLoading: false,
    } as ReturnType<typeof useRecentPRs>)
    renderTable()
    expect(screen.getByText(/ยังไม่มีข้อมูล/)).toBeInTheDocument()
  })

  it('shows loading skeleton', () => {
    vi.mocked(useRecentPRs).mockReturnValue({ data: undefined, isLoading: true } as ReturnType<
      typeof useRecentPRs
    >)
    renderTable()
    expect(screen.getByTestId('recent-prs-loading')).toBeInTheDocument()
  })

  it('header uses shared table-header color (consistent with PRList)', () => {
    vi.mocked(useRecentPRs).mockReturnValue({ data: [pr], isLoading: false } as ReturnType<
      typeof useRecentPRs
    >)
    renderTable()
    const thead = screen.getByText('เลขที่ PR').closest('thead')
    expect(thead).toHaveClass('bg-table-header')
  })
})
