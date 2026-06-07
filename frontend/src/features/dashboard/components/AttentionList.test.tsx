import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../hooks/useAttentionPRs', () => ({ useAttentionPRs: vi.fn() }))
import { useAttentionPRs } from '../hooks/useAttentionPRs'
import { AttentionList } from './AttentionList'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

function mkPR(over: Partial<PurchaseRequest>): PurchaseRequest {
  return {
    id: 1,
    prNumber: 'PR-2026-0001',
    title: 'Item',
    status: 'draft',
    totalEstimatedAmount: 1000,
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
    ...over,
  }
}

function mockAttention(drafts: PurchaseRequest[], rejected: PurchaseRequest[]) {
  vi.mocked(useAttentionPRs).mockReturnValue({
    data: { drafts, rejected },
    isLoading: false,
  } as ReturnType<typeof useAttentionPRs>)
}

function renderList() {
  return render(
    <MemoryRouter>
      <AttentionList />
    </MemoryRouter>,
  )
}

describe('AttentionList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hidden entirely when no drafts and no rejected', () => {
    mockAttention([], [])
    renderList()
    expect(screen.queryByTestId('attention-list')).not.toBeInTheDocument()
  })

  it('lists individual draft PRs, each linking to its detail page', () => {
    mockAttention([mkPR({ id: 3, prNumber: 'PR-2026-0003', title: 'Laptop', status: 'draft' })], [])
    renderList()
    expect(screen.getByText(/Draft รอส่ง/)).toBeInTheDocument()
    const row = screen.getByRole('link', { name: /PR-2026-0003/ })
    expect(row).toHaveAttribute('href', '/purchase-requests/3')
    expect(screen.getByText('Laptop')).toBeInTheDocument()
    // ไม่มี section rejected
    expect(screen.queryByText(/Rejected รอแก้/)).not.toBeInTheDocument()
  })

  it('lists rejected PRs linking to detail, with ดูทั้งหมด to the filtered list', () => {
    mockAttention(
      [],
      [mkPR({ id: 9, prNumber: 'PR-2026-0009', title: 'Chair', status: 'rejected' })],
    )
    renderList()
    expect(screen.getByText(/Rejected รอแก้/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /PR-2026-0009/ })).toHaveAttribute(
      'href',
      '/purchase-requests/9',
    )
    expect(screen.getByRole('link', { name: /ดูทั้งหมด/ })).toHaveAttribute(
      'href',
      '/purchase-requests?status=rejected',
    )
  })

  it('shows both sections when both present', () => {
    mockAttention(
      [mkPR({ id: 3, prNumber: 'PR-2026-0003', status: 'draft' })],
      [mkPR({ id: 9, prNumber: 'PR-2026-0009', status: 'rejected' })],
    )
    renderList()
    expect(screen.getByText(/Draft รอส่ง/)).toBeInTheDocument()
    expect(screen.getByText(/Rejected รอแก้/)).toBeInTheDocument()
  })
})
