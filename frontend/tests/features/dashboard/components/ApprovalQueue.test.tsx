import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/features/dashboard/hooks/useApprovalQueue', () => ({ useApprovalQueue: vi.fn() }))
import { useApprovalQueue } from '@/features/dashboard/hooks/useApprovalQueue'
import { ApprovalQueue } from '@/features/dashboard/components/ApprovalQueue'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

const makePr = (id: number): PurchaseRequest => ({
  id,
  prNumber: `PR-2026-000${id}`,
  title: `Item ${id}`,
  status: 'submitted',
  totalEstimatedAmount: 1000,
  quarter: null,
  requiredDate: '2026-02-01',
  requesterId: id,
  requester: { id, fullName: `User ${id}`, email: `u${id}@x.com` },
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  approvedBy: null,
  approver: null,
  approvedAt: null,
  rejectReason: null,
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
})

function renderQueue() {
  return render(
    <MemoryRouter>
      <ApprovalQueue />
    </MemoryRouter>,
  )
}

describe('ApprovalQueue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders submitted PR rows with links to detail', () => {
    vi.mocked(useApprovalQueue).mockReturnValue({
      data: [makePr(1)],
      isLoading: false,
    } as ReturnType<typeof useApprovalQueue>)
    renderQueue()
    expect(screen.getByText('PR-2026-0001')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ดู \/ อนุมัติ/ })).toHaveAttribute(
      'href',
      '/purchase-requests/1',
    )
  })

  it('shows empty state when no submitted PRs', () => {
    vi.mocked(useApprovalQueue).mockReturnValue({
      data: [] as PurchaseRequest[],
      isLoading: false,
    } as ReturnType<typeof useApprovalQueue>)
    renderQueue()
    expect(screen.getByText('ไม่มีรายการรออนุมัติ')).toBeInTheDocument()
  })

  it('shows "ดูทั้งหมด" link when 5 items returned (may be more)', () => {
    vi.mocked(useApprovalQueue).mockReturnValue({
      data: [1, 2, 3, 4, 5].map(makePr),
      isLoading: false,
    } as ReturnType<typeof useApprovalQueue>)
    renderQueue()
    expect(screen.getByRole('link', { name: /ดูทั้งหมด/ })).toHaveAttribute(
      'href',
      '/purchase-requests?status=submitted&q=1',
    )
  })
})
