import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/shared/hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../hooks/useStats', () => ({ useStats: vi.fn() }))
vi.mock('../hooks/useRecentPRs', () => ({ useRecentPRs: vi.fn() }))
vi.mock('../hooks/useApprovalQueue', () => ({ useApprovalQueue: vi.fn() }))
vi.mock('../hooks/useBudgets', () => ({ useBudgets: vi.fn() }))

import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { useStats } from '../hooks/useStats'
import { useRecentPRs } from '../hooks/useRecentPRs'
import { useApprovalQueue } from '../hooks/useApprovalQueue'
import { useBudgets } from '../hooks/useBudgets'
import { DashboardPage } from './DashboardPage'
import type { User } from '@/shared/types'
import type { PurchaseRequest } from '@/features/purchase-requests/types'
import type { DashboardBudget } from '../api'

const baseUser: User = {
  id: 1, email: 'u@x.com', firstName: 'A', middleName: null, lastName: 'B', fullName: 'A B',
  role: 'employee', isActive: true, departmentId: 1, createdAt: '', updatedAt: '',
}

function mockHooks(role: User['role']) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: { ...baseUser, role } } as ReturnType<typeof useCurrentUser>)
  vi.mocked(useStats).mockReturnValue({ data: { total: 4, draft: 1, submitted: 1, approved: 1, rejected: 1 }, isLoading: false } as ReturnType<typeof useStats>)
  vi.mocked(useRecentPRs).mockReturnValue({ data: [] as PurchaseRequest[], isLoading: false } as ReturnType<typeof useRecentPRs>)
  vi.mocked(useApprovalQueue).mockReturnValue({ data: [] as PurchaseRequest[], isLoading: false } as ReturnType<typeof useApprovalQueue>)
  vi.mocked(useBudgets).mockReturnValue({ data: [] as DashboardBudget[], isLoading: false } as ReturnType<typeof useBudgets>)
}

function renderPage() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>)
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('employee: StatCards + AttentionList(if any) + New PR + RecentPRs; NO ApprovalQueue/BudgetSummary/StatusChart', () => {
    mockHooks('employee')
    renderPage()
    expect(screen.getByTestId('stat-cards')).toBeInTheDocument()
    expect(screen.getByTestId('recent-prs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new pr/i })).toBeInTheDocument()
    expect(screen.getByTestId('attention-list')).toBeInTheDocument() // draft=1
    expect(screen.queryByTestId('approval-queue')).not.toBeInTheDocument()
    expect(screen.queryByTestId('budget-summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
  })

  it('manager: ApprovalQueue + StatCards + BudgetSummary + RecentPRs; NO AttentionList/New PR/StatusChart', () => {
    mockHooks('manager')
    renderPage()
    expect(screen.getByTestId('approval-queue')).toBeInTheDocument()
    expect(screen.getByTestId('stat-cards')).toBeInTheDocument()
    expect(screen.getByTestId('budget-summary')).toBeInTheDocument()
    expect(screen.queryByTestId('attention-list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /new pr/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
  })

  it('procurement_officer: StatCards + StatusChart + BudgetSummary + RecentPRs; NO ApprovalQueue/AttentionList', () => {
    mockHooks('procurement_officer')
    renderPage()
    expect(screen.getByTestId('stat-cards')).toBeInTheDocument()
    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('budget-summary')).toBeInTheDocument()
    expect(screen.queryByTestId('approval-queue')).not.toBeInTheDocument()
    expect(screen.queryByTestId('attention-list')).not.toBeInTheDocument()
  })
})
