import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useStats', () => ({ useStats: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useRecentPRs', () => ({ useRecentPRs: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useApprovalQueue', () => ({ useApprovalQueue: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useAttentionPRs', () => ({ useAttentionPRs: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useDepartments', () => ({ useDepartments: vi.fn(() => ({ data: [] })) }))
vi.mock('@/features/dashboard/hooks/useTrend', () => ({ useTrend: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useSpendByDept', () => ({ useSpendByDept: vi.fn() }))

import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useStats } from '@/features/dashboard/hooks/useStats'
import { useRecentPRs } from '@/features/dashboard/hooks/useRecentPRs'
import { useApprovalQueue } from '@/features/dashboard/hooks/useApprovalQueue'
import { useBudgets } from '@/features/dashboard/hooks/useBudgets'
import { useAttentionPRs } from '@/features/dashboard/hooks/useAttentionPRs'
import { useTrend } from '@/features/dashboard/hooks/useTrend'
import { useSpendByDept } from '@/features/dashboard/hooks/useSpendByDept'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import type { User } from '@/shared/types'
import type { PurchaseRequest } from '@/features/purchase-requests/types'
import type { DashboardBudget, TrendPoint, SpendByDept } from '@/features/dashboard/api'

const baseUser: User = {
  id: 1,
  email: 'u@x.com',
  firstName: 'A',
  middleName: null,
  lastName: 'B',
  fullName: 'A B',
  role: 'employee',
  isActive: true,
  departmentId: 1,
  createdAt: '',
  updatedAt: '',
}

const draftPR: PurchaseRequest = {
  id: 1,
  prNumber: 'PR-2026-0001',
  title: 'Draft item',
  status: 'draft',
  totalEstimatedAmount: '1000',
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

function mockHooks(role: User['role']) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: { ...baseUser, role } } as ReturnType<
    typeof useCurrentUser
  >)
  vi.mocked(useStats).mockReturnValue({
    data: { total: 4, draft: 1, submitted: 1, approved: 1, rejected: 1 },
    isLoading: false,
  } as ReturnType<typeof useStats>)
  vi.mocked(useRecentPRs).mockReturnValue({
    data: [] as PurchaseRequest[],
    isLoading: false,
  } as ReturnType<typeof useRecentPRs>)
  vi.mocked(useApprovalQueue).mockReturnValue({
    data: [] as PurchaseRequest[],
    isLoading: false,
  } as ReturnType<typeof useApprovalQueue>)
  vi.mocked(useBudgets).mockReturnValue({
    data: [] as DashboardBudget[],
    isLoading: false,
  } as ReturnType<typeof useBudgets>)
  vi.mocked(useAttentionPRs).mockReturnValue({
    data: { drafts: [draftPR], rejected: [] as PurchaseRequest[] },
    isLoading: false,
  } as ReturnType<typeof useAttentionPRs>)
  vi.mocked(useTrend).mockReturnValue({
    data: [] as TrendPoint[],
    isLoading: false,
  } as ReturnType<typeof useTrend>)
  vi.mocked(useSpendByDept).mockReturnValue({
    data: [] as SpendByDept[],
    isLoading: false,
  } as ReturnType<typeof useSpendByDept>)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('employee: StatCards + AttentionList + New PR + RecentPRs; NO ApprovalQueue/BudgetSummary/charts', () => {
    mockHooks('employee')
    renderPage()
    expect(screen.getByTestId('stat-cards')).toBeInTheDocument()
    expect(screen.getByTestId('recent-prs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new pr/i })).toBeInTheDocument()
    expect(screen.getByTestId('attention-list')).toBeInTheDocument() // draft=1
    expect(screen.queryByTestId('approval-queue')).not.toBeInTheDocument()
    expect(screen.queryByTestId('budget-summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pr-trend-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('spend-by-dept-chart')).not.toBeInTheDocument()
  })

  it('manager: ApprovalQueue + PrTrend + StatusChart + BudgetSummary + RecentPRs; NO AttentionList/New PR/spend-by-dept', () => {
    mockHooks('manager')
    renderPage()
    expect(screen.getByTestId('approval-queue')).toBeInTheDocument()
    expect(screen.getByTestId('stat-cards')).toBeInTheDocument()
    expect(screen.getByTestId('pr-trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('budget-summary')).toBeInTheDocument()
    expect(screen.getByTestId('recent-prs')).toBeInTheDocument()
    expect(screen.queryByTestId('attention-list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /new pr/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('spend-by-dept-chart')).not.toBeInTheDocument()
  })

  it('procurement_officer: PrTrend + StatusChart + SpendByDept + BudgetSummary + RecentPRs; NO ApprovalQueue/AttentionList', () => {
    mockHooks('procurement_officer')
    renderPage()
    expect(screen.getByTestId('stat-cards')).toBeInTheDocument()
    expect(screen.getByTestId('pr-trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('spend-by-dept-chart')).toBeInTheDocument()
    expect(screen.getByTestId('budget-summary')).toBeInTheDocument()
    expect(screen.getByTestId('recent-prs')).toBeInTheDocument()
    expect(screen.queryByTestId('approval-queue')).not.toBeInTheDocument()
    expect(screen.queryByTestId('attention-list')).not.toBeInTheDocument()
  })
})
