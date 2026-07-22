import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/features/dashboard/hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useDepartments', () => ({ useDepartments: vi.fn() }))
import { useBudgets } from '@/features/dashboard/hooks/useBudgets'
import { useDepartments } from '@/features/dashboard/hooks/useDepartments'
import { BudgetSummary } from '@/features/dashboard/components/BudgetSummary'
import type { DashboardBudget, DashboardDepartment } from '@/features/dashboard/api'

const budget = (over: Partial<DashboardBudget>): DashboardBudget => ({
  id: 1,
  departmentId: 1,
  department: { id: 1, name: 'IT' },
  fiscalYear: 2026,
  quarter: null,
  totalAmount: 1000,
  reservedAmount: 0,
  usedAmount: 0,
  ...over,
})

function mockBudgets(data: DashboardBudget[], isLoading = false) {
  vi.mocked(useBudgets).mockReturnValue({ data, isLoading } as ReturnType<typeof useBudgets>)
}

const departments: DashboardDepartment[] = [
  { id: 1, name: 'IT' },
  { id: 2, name: 'Finance' },
  { id: 3, name: 'Operations' },
]

describe('BudgetSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDepartments).mockReturnValue({ data: departments } as ReturnType<
      typeof useDepartments
    >)
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

  it('labels the percent figure in Thai (ใช้แล้ว, not English "used")', () => {
    mockBudgets([budget({ reservedAmount: 300, usedAmount: 200 })])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.getByText(/ใช้แล้ว/)).toBeInTheDocument()
    expect(screen.queryByText(/used/)).not.toBeInTheDocument()
  })

  it('labels an annual budget (quarter null) as รายปี, matching the budgets feature', () => {
    mockBudgets([budget({ quarter: null })])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.getByText('รายปี')).toBeInTheDocument()
    expect(screen.queryByText('Annual')).not.toBeInTheDocument()
  })

  it('keeps quarterly budgets as Q{n} (feature convention)', () => {
    mockBudgets([budget({ quarter: 2 })])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.getByText('Q2')).toBeInTheDocument()
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

  it('lets the filter row wrap so the fixed-width selects cannot push the page sideways', () => {
    mockBudgets([budget({})])
    render(<BudgetSummary scope={{}} />)
    const row = screen.getByTestId('budget-dept-select').closest('div.flex.items-center.justify-between')
    expect(row).toHaveClass('flex-wrap')
  })

  it('manager (fixed dept): hides department filter, keeps year filter', () => {
    mockBudgets([budget({})])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    expect(screen.queryByTestId('budget-dept-select')).not.toBeInTheDocument()
    expect(screen.getByTestId('budget-year-select')).toBeInTheDocument()
  })

  it('renders all budgets (sorted least-remaining first) with no collapse toggle — the card scrolls instead', () => {
    // remaining = total - (reserved+used): dept ids by remaining ascending = 5,4,3,2,1
    const many = [1, 2, 3, 4, 5].map((id) =>
      budget({
        id,
        departmentId: id,
        department: { id, name: `Dept ${id}` },
        totalAmount: 1000,
        reservedAmount: id * 100,
        usedAmount: 0,
      }),
    )
    mockBudgets(many)
    render(<BudgetSummary scope={{}} />)

    // every budget renders (no slice); least-remaining (id=5, reserved 500) shows first
    expect(screen.getAllByTestId('budget-row')).toHaveLength(5)
    expect(screen.getAllByTestId('budget-row')[0]).toHaveTextContent('Dept 5')
    expect(screen.getByText('Dept 1')).toBeInTheDocument()

    // the show-all / collapse toggle is gone (replaced by in-card vertical scroll)
    expect(screen.queryByRole('button', { name: /แสดงทั้งหมด|ย่อ/ })).not.toBeInTheDocument()
  })

  it('shows skeletons while loading', () => {
    mockBudgets([], true)
    render(<BudgetSummary scope={{}} />)
    expect(screen.getByTestId('budget-summary-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('budget-row')).not.toBeInTheDocument()
    expect(screen.queryByText(/ยังไม่มีงบ/)).not.toBeInTheDocument()
  })

  it('renders each budget as a table row with mono used/total figures', () => {
    mockBudgets([budget({ reservedAmount: 300, usedAmount: 200, totalAmount: 1000 })])
    render(<BudgetSummary scope={{ departmentId: 1 }} />)
    const row = screen.getByTestId('budget-row')
    expect(row.tagName).toBe('TR')
    // used = reserved+used = 500; total = 1000 — compact baht (฿500 / ฿1K)
    expect(screen.getByText(/฿500 \/ ฿1K/)).toBeInTheDocument()
  })
})
