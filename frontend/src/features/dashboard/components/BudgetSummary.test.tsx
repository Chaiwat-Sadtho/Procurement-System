import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('../hooks/useDepartments', () => ({ useDepartments: vi.fn() }))
import { useBudgets } from '../hooks/useBudgets'
import { useDepartments } from '../hooks/useDepartments'
import { BudgetSummary } from './BudgetSummary'
import type { DashboardBudget, DashboardDepartment } from '../api'

const budget = (over: Partial<DashboardBudget>): DashboardBudget => ({
  id: 1, departmentId: 1, department: { id: 1, name: 'IT' }, fiscalYear: 2026, quarter: null,
  totalAmount: 1000, reservedAmount: 0, usedAmount: 0, ...over,
})

function mockBudgets(data: DashboardBudget[], isLoading = false) {
  vi.mocked(useBudgets).mockReturnValue({ data, isLoading } as ReturnType<typeof useBudgets>)
}

const departments: DashboardDepartment[] = [
  { id: 1, name: 'IT' }, { id: 2, name: 'Finance' }, { id: 3, name: 'Operations' },
]

describe('BudgetSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDepartments).mockReturnValue({ data: departments } as ReturnType<typeof useDepartments>)
  })

  it('renders percent used (reserved+used)/total', () => {
    mockBudgets([budget({ reservedAmount: 300, usedAmount: 200 })])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('marks warning when over 80%', () => {
    mockBudgets([budget({ reservedAmount: 850, usedAmount: 0 })])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.getByTestId('budget-warn-1')).toBeInTheDocument()
  })

  it('shows empty state when no budgets', () => {
    mockBudgets([])
    render(<BudgetSummary scope={{}} />)
    expect(screen.getByText(/ยังไม่มีงบ/)).toBeInTheDocument()
  })

  it('PO (no fixed dept): shows both department + year filters', () => {
    mockBudgets([budget({})])
    render(<BudgetSummary scope={{}} />)
    expect(screen.getByTestId('budget-dept-select')).toBeInTheDocument()
    expect(screen.getByTestId('budget-year-select')).toBeInTheDocument()
  })

  it('manager (fixed dept): hides department filter, keeps year filter', () => {
    mockBudgets([budget({})])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.queryByTestId('budget-dept-select')).not.toBeInTheDocument()
    expect(screen.getByTestId('budget-year-select')).toBeInTheDocument()
  })

  it('collapses to first N (sorted least-remaining first) with a show-all toggle', async () => {
    // remaining = total - (reserved+used): dept ids by remaining ascending = 5,4,3,2,1
    const many = [1, 2, 3, 4, 5].map((id) =>
      budget({ id, departmentId: id, department: { id, name: `Dept ${id}` }, totalAmount: 1000, reservedAmount: id * 100, usedAmount: 0 }),
    )
    mockBudgets(many)
    render(<BudgetSummary scope={{}} />)

    // collapsed: only 4 rows; the least-remaining (id=5, reserved 500) shows first
    expect(screen.getAllByTestId('budget-row')).toHaveLength(4)
    expect(screen.getAllByTestId('budget-row')[0]).toHaveTextContent('Dept 5')
    expect(screen.queryByText('Dept 1')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /แสดงทั้งหมด/ }))
    expect(screen.getAllByTestId('budget-row')).toHaveLength(5)
    expect(screen.getByText('Dept 1')).toBeInTheDocument()

    // ย่อกลับได้
    await userEvent.click(screen.getByRole('button', { name: /ย่อ/ }))
    expect(screen.getAllByTestId('budget-row')).toHaveLength(4)
    expect(screen.queryByText('Dept 1')).not.toBeInTheDocument()
  })

  it('shows skeletons while loading', () => {
    mockBudgets([], true)
    render(<BudgetSummary scope={{}} />)
    expect(screen.getByTestId('budget-summary-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('budget-row')).not.toBeInTheDocument()
    expect(screen.queryByText(/ยังไม่มีงบ/)).not.toBeInTheDocument()
  })
})
