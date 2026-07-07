import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/features/dashboard/hooks/useRecentPRs', () => ({ useRecentPRs: vi.fn() }))

// mock useNavigate to assert whole-row navigation; spread actual so MemoryRouter/Link stay real
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
import { useRecentPRs } from '@/features/dashboard/hooks/useRecentPRs'
import { RecentPRsTable } from '@/features/dashboard/components/RecentPRsTable'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

const pr: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2026-0001',
  title: 'Laptop',
  status: 'submitted',
  totalEstimatedAmount: '5000',
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

  it('navigates to the PR detail when a non-link cell of the row is clicked', async () => {
    vi.mocked(useRecentPRs).mockReturnValue({ data: [pr], isLoading: false } as ReturnType<
      typeof useRecentPRs
    >)
    renderTable()
    // click a NON-link cell (title); the เลขที่ PR cell is the link, which stops propagation
    await userEvent.click(screen.getByText('Laptop'))
    expect(mockNavigate).toHaveBeenCalledWith('/purchase-requests/1')
  })

  it('exposes เลขที่ PR as a real link that does not double-fire the row onClick', async () => {
    vi.mocked(useRecentPRs).mockReturnValue({ data: [pr], isLoading: false } as ReturnType<
      typeof useRecentPRs
    >)
    renderTable()
    const link = screen.getByRole('link', { name: 'PR-2026-0001' })
    expect(link).toHaveAttribute('href', '/purchase-requests/1')
    // stopPropagation guard: the link handles nav; the row onClick must not also fire
    await userEvent.click(link)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
