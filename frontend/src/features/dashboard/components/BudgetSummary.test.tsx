import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
import { useBudgets } from '../hooks/useBudgets'
import { BudgetSummary } from './BudgetSummary'
import type { DashboardBudget } from '../api'

const budget = (over: Partial<DashboardBudget>): DashboardBudget => ({
  id: 1, departmentId: 1, department: { id: 1, name: 'IT' }, fiscalYear: 2026, quarter: null,
  totalAmount: 1000, reservedAmount: 0, usedAmount: 0, ...over,
})

describe('BudgetSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders percent used (reserved+used)/total', () => {
    vi.mocked(useBudgets).mockReturnValue({ data: [budget({ reservedAmount: 300, usedAmount: 200 })], isLoading: false } as ReturnType<typeof useBudgets>)
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('marks warning when over 80%', () => {
    vi.mocked(useBudgets).mockReturnValue({ data: [budget({ reservedAmount: 850, usedAmount: 0 })], isLoading: false } as ReturnType<typeof useBudgets>)
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.getByTestId('budget-warn-1')).toBeInTheDocument()
  })

  it('shows empty state when no budgets', () => {
    vi.mocked(useBudgets).mockReturnValue({ data: [] as DashboardBudget[], isLoading: false } as ReturnType<typeof useBudgets>)
    render(<BudgetSummary scope={{}} />)
    expect(screen.getByText(/ยังไม่มีงบสำหรับปีนี้/)).toBeInTheDocument()
  })
})
